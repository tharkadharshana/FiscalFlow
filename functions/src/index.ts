//
// File: functions/src/index.ts
//
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

admin.initializeApp();
const db = admin.firestore();

/**
 * This function automatically updates a user's monthly budget spend
 * whenever a relevant expense transaction is created, updated, or deleted.
 */
export const updateBudgetOnTransactionChange = functions.firestore
  .document("/users/{userId}/transactions/{transactionId}")
  .onWrite(async (change, context) => {
    const { userId } = context.params;

    const transactionBefore = change.before.data();
    const transactionAfter = change.after.data();

    const amountBefore = transactionBefore?.type === "expense" ? transactionBefore.amount : 0;
    const categoryBefore = transactionBefore?.category;
    const dateBefore = transactionBefore?.date as Timestamp;

    const amountAfter = transactionAfter?.type === "expense" ? transactionAfter.amount : 0;
    const categoryAfter = transactionAfter?.category;
    const dateAfter = transactionAfter?.date as Timestamp;

    // Case 1: Transaction created
    if (!change.before.exists && change.after.exists && amountAfter > 0) {
      const month = dateAfter.toDate().toISOString().slice(0, 7);
      await updateBudget(userId, categoryAfter, amountAfter, month);
    }

    // Case 2: Transaction deleted
    if (change.before.exists && !change.after.exists && amountBefore > 0) {
      const month = dateBefore.toDate().toISOString().slice(0, 7);
      await updateBudget(userId, categoryBefore, -amountBefore, month);
    }

    // Case 3: Transaction updated
    if (change.before.exists && change.after.exists) {
      const amountDifference = amountAfter - amountBefore;
      if (categoryBefore === categoryAfter) {
        if (amountDifference !== 0) {
            const month = dateAfter.toDate().toISOString().slice(0, 7);
            await updateBudget(userId, categoryAfter, amountDifference, month);
        }
      } else {
        // Category changed, so treat as a delete from old and create in new
        if (amountBefore > 0) {
            const monthOld = dateBefore.toDate().toISOString().slice(0, 7);
            await updateBudget(userId, categoryBefore, -amountBefore, monthOld);
        }
        if (amountAfter > 0) {
            const monthNew = dateAfter.toDate().toISOString().slice(0, 7);
            await updateBudget(userId, categoryAfter, amountAfter, monthNew);
        }
      }
    }
    return null;
  });

async function updateBudget(userId: string, category: string, amountChange: number, month: string) {
  const budgetQuery = db.collection("users").doc(userId).collection("budgets")
    .where("category", "==", category)
    .where("month", "==", month);

  const budgetSnapshot = await budgetQuery.get();

  if (budgetSnapshot.empty) {
    functions.logger.log(`No budget for category '${category}' in month '${month}'.`);
    return;
  }

  const budgetDoc = budgetSnapshot.docs[0];
  const currentSpend = (budgetDoc.data().currentSpend || 0) + amountChange;
  
  functions.logger.log(`Updating budget ${budgetDoc.id} spend by ${amountChange}. New spend: ${currentSpend}`);
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
    functions.logger.log("Running recurring transaction generator for", now.toISOString());

    const recurringTxsQuery = db.collectionGroup("recurringTransactions")
      .where("isActive", "==", true);

    const snapshot = await recurringTxsQuery.get();
    if (snapshot.empty) {
      functions.logger.log("No active recurring transactions to process.");
      return null;
    }

    const promises = snapshot.docs.map(async (doc) => {
      const recurringTx = doc.data();
      const userId = doc.ref.parent.parent?.id;
      if (!userId) return;

      if (shouldGenerateTransaction(recurringTx, now)) {
        functions.logger.log(`Generating transaction for '${recurringTx.title}' for user ${userId}`);
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
    functions.logger.log("Finished recurring transaction generator.");
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