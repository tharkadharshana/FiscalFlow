
//
// File: functions/src/index.ts
//
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { Logging } from '@google-cloud/logging';
import * as cors from 'cors';

admin.initializeApp();
const db = admin.firestore();

// Initialize CORS middleware
const corsHandler = cors({ origin: true });

// Initialize Google Cloud Logging
const logging = new Logging({
    projectId: process.env.GCLOUD_PROJECT,
});
const log = logging.log('fiscalflow-app-logs');

/**
 * HTTP function for client-side logging.
 */
export const logMessage = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).send({ error: { message: 'Method Not Allowed' } });
            return;
        }

        try {
            const { level, message, details } = req.body.data || req.body;
            const uid = details?.userId;

            if (!level || !message) {
                res.status(400).send({ error: { message: 'Missing level or message in request body.' } });
                return;
            }

            const severityMap: {[key: string]: string} = {
                info: 'INFO',
                warn: 'WARNING',
                error: 'ERROR'
            };
            
            const severity = severityMap[level] || 'DEFAULT';

            const metadata = {
                resource: { type: 'global' },
                severity: severity,
                labels: { userId: uid || 'unauthenticated' },
            };

            const logEntryPayload = {
                message: message,
                userId: uid,
                ...details,
            };
            
            const logEntry = log.entry(metadata, logEntryPayload);
            
            await log.write(logEntry);
            res.status(200).send({ data: { success: true } });

        } catch (error) {
            console.error("Failed to process log request:", error);
            res.status(500).send({ error: { message: 'Could not process log request.' } });
        }
    });
});


/**
 * This function automatically updates a user's monthly budget spend
 * whenever a relevant expense transaction is created, updated, or deleted.
 */
export const updateBudgetOnTransactionChange = functions.firestore
  .document("/users/{userId}/transactions/{transactionId}")
  .onWrite(async (change, context) => {
    const { userId } = context.params;

    const transactionBefore = change.before.exists ? change.before.data() : null;
    const transactionAfter = change.after.exists ? change.after.data() : null;
    
    // If a new transaction is linked to a trip, do not update monthly budget.
    // Also, if the transaction was updated to be linked to a trip, we need to revert its previous contribution.
    const beforeIsTrip = transactionBefore?.tripId;
    const afterIsTrip = transactionAfter?.tripId;

    // Case 1: Transaction created
    if (!transactionAfter?.isRecurring && !afterIsTrip && transactionAfter?.type === 'expense') {
        const date = (transactionAfter.date as Timestamp).toDate();
        const month = date.toISOString().slice(0, 7);
        await updateBudget(userId, transactionAfter.category, transactionAfter.amount, month);
    } 
    // Case 2: Transaction deleted
    else if (!beforeIsTrip && transactionBefore?.type === 'expense') {
        const date = (transactionBefore.date as Timestamp).toDate();
        const month = date.toISOString().slice(0, 7);
        await updateBudget(userId, transactionBefore.category, -transactionBefore.amount, month);
    }
    // Case 3: Transaction updated
    else if (transactionBefore && transactionAfter) {
        // Revert old transaction's impact if it was a non-trip expense
        if (transactionBefore.type === 'expense' && !beforeIsTrip) {
            const oldDate = (transactionBefore.date as Timestamp).toDate();
            const oldMonth = oldDate.toISOString().slice(0, 7);
            await updateBudget(userId, transactionBefore.category, -transactionBefore.amount, oldMonth);
        }
        // Add new transaction's impact if it is now a non-trip expense
        if (transactionAfter.type === 'expense' && !afterIsTrip) {
            const newDate = (transactionAfter.date as Timestamp).toDate();
            const newMonth = newDate.toISOString().slice(0, 7);
            await updateBudget(userId, transactionAfter.category, transactionAfter.amount, newMonth);
        }
    }
    
    return null;
  });

async function updateBudget(userId: string, category: string, amountChange: number, month: string) {
  if (!category || !month || amountChange === 0) {
    functions.logger.info(`Skipping budget update for user ${userId} due to missing data or zero amount change.`);
    return;
  }
  
  const budgetQuery = db.collection("users").doc(userId).collection("budgets")
    .where("category", "==", category)
    .where("month", "==", month);

  const budgetSnapshot = await budgetQuery.get();

  if (budgetSnapshot.empty) {
    functions.logger.info(`No budget found for category '${category}' in month '${month}' for user ${userId}. No action taken.`);
    return;
  }

  const budgetDoc = budgetSnapshot.docs[0];
  const currentSpend = (budgetDoc.data().currentSpend || 0) + amountChange;
  
  functions.logger.log(`Updating budget ${budgetDoc.id} for user ${userId}. Category: ${category}, Spend change: ${amountChange}. New spend: ${currentSpend}`);
  await budgetDoc.ref.update({ currentSpend: Math.max(0, currentSpend) });
}

/**
 * This scheduled function runs once a day to generate transactions 
 * from active recurring templates.
 */
export const generateRecurringTransactions = functions.pubsub
  .schedule("every 24 hours")
  .onRun(async () => {
    const now = new Date();
    functions.logger.info("Starting recurring transaction generator for", now.toISOString());

    const recurringTxsQuery = db.collectionGroup("recurringTransactions")
      .where("isActive", "==", true);

    const snapshot = await recurringTxsQuery.get();
    if (snapshot.empty) {
      functions.logger.info("No active recurring transactions to process.");
      return null;
    }

    const promises = snapshot.docs.map(async (doc) => {
      const recurringTx = doc.data();
      const userId = doc.ref.parent.parent?.id;
      if (!userId) return;

      if (shouldGenerateTransaction(recurringTx, now)) {
        functions.logger.info(`Generating transaction for '${recurringTx.title}' for user ${userId}`);
        const newTransaction = {
          type: recurringTx.type,
          amount: recurringTx.amount,
          category: recurringTx.category,
          date: Timestamp.fromDate(now),
          source: recurringTx.source,
          notes: `Recurring: ${recurringTx.title}`,
          isRecurring: true,
          userId: userId,
          createdAt: Timestamp.now(),
        };

        const batch = db.batch();
        const transactionRef = db.collection("users").doc(userId).collection("transactions").doc();
        batch.set(transactionRef, newTransaction);
        batch.update(doc.ref, { lastGeneratedDate: Timestamp.fromDate(now) });
        await batch.commit();
      }
    });

    await Promise.all(promises);
    functions.logger.info("Finished recurring transaction generator.");
    return null;
  });

function shouldGenerateTransaction(tx: admin.firestore.DocumentData, now: Date): boolean {
  const lastGenerated = (tx.lastGeneratedDate as Timestamp)?.toDate();
  const start = (tx.startDate as Timestamp).toDate();

  if (now < start) return false;

  const referenceDate = lastGenerated || start;
  const nextDate = new Date(referenceDate);

  // Set to beginning of day to avoid time-of-day issues
  nextDate.setHours(0, 0, 0, 0);

  switch (tx.frequency) {
    case "daily": nextDate.setDate(nextDate.getDate() + 1); break;
    case "weekly": nextDate.setDate(nextDate.getDate() + 7); break;
    case "monthly": nextDate.setMonth(nextDate.getMonth() + 1); break;
    case "yearly": nextDate.setFullYear(nextDate.getFullYear() + 1); break;
    default: return false;
  }
  
  // If it's the first time running, we should generate if today is on or after the start date
  if (!lastGenerated) {
    return now.setHours(0,0,0,0) >= start.setHours(0,0,0,0);
  }

  return now.setHours(0, 0, 0, 0) >= nextDate.getTime();
}
