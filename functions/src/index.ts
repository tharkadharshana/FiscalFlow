//
// File: functions/src/index.ts
//
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { Logging } from '@google-cloud/logging';
import * as cors from 'cors';
import { google } from 'googleapis';
import * as cheerio from 'cheerio';

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
    // Wrap the function logic with the CORS middleware
    corsHandler(req, res, async () => {
        // The cors middleware handles preflight (OPTIONS) requests automatically.
        // We only need to handle the actual POST request logic.
        if (req.method === 'POST') {
            const { level, message, details } = req.body;
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
            
            try {
                await log.write(logEntry);
                res.status(200).send({ data: { success: true } });
            } catch (error) {
                console.error("Failed to write log entry:", error);
                res.status(500).send({ error: { message: 'Could not write log entry.' } });
            }
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
  if (!category || !month) {
    functions.logger.warn(`Attempted to update budget with missing category or month for user ${userId}.`);
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
  
  functions.logger.log(`Updating budget ${budgetDoc.id} for user ${userId}. Spend change: ${amountChange}. New spend: ${currentSpend}`);
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

// --- GMAIL INTEGRATION ---

const oauth2Client = new google.auth.OAuth2(
    functions.config().google.client_id,
    functions.config().google.client_secret,
    functions.config().google.redirect_uri
);

// Helper to get an authenticated Gmail service client for a user
async function getGmailService(userId: string) {
    const doc = await db.collection('gmail_tokens').doc(userId).get();
    if (!doc.exists) throw new Error('No Gmail tokens found for user.');
    
    const data = doc.data()!;
    oauth2Client.setCredentials({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expiry_date: data.expiry_date,
        scope: data.scope,
    });
    
    // google-auth-library will automatically use the refresh_token if the access_token is expired.
    // We can check if it was refreshed and update our stored tokens.
    oauth2Client.on('tokens', async (tokens) => {
        if (tokens.refresh_token) {
            // New refresh token, update it.
            await db.collection('gmail_tokens').doc(userId).update({
                refresh_token: tokens.refresh_token,
            });
        }
        await db.collection('gmail_tokens').doc(userId).update({
            access_token: tokens.access_token,
            expiry_date: tokens.expiry_date,
            last_updated: new Date().toISOString()
        });
        functions.logger.info(`Refreshed tokens for user ${userId}`);
    });
    
    return google.gmail({ version: 'v1', auth: oauth2Client });
}

function getEmailBody(msgPayload: any): string {
    let bodyContent = "";
    if (msgPayload.body.size > 0) {
        bodyContent = Buffer.from(msgPayload.body.data, 'base64').toString('utf-8');
        if (msgPayload.mimeType === 'text/html') {
            const $ = cheerio.load(bodyContent);
            return $('body').text();
        }
        return bodyContent;
    }

    const parts = msgPayload.parts || [];
    const plainTextPart = parts.find((part: any) => part.mimeType === 'text/plain');
    if (plainTextPart) {
        return Buffer.from(plainTextPart.body.data, 'base64').toString('utf-8');
    }

    const htmlPart = parts.find((part: any) => part.mimeType === 'text/html');
    if (htmlPart) {
        const htmlContent = Buffer.from(htmlPart.body.data, 'base64').toString('utf-8');
        const $ = cheerio.load(htmlContent);
        return $('body').text();
    }
    return "";
}

function extractFinancialData(emailBody: string, subject = ""): { amount?: number; invoice_number?: string; due_date?: string; } | null {
    const financialDetails: { amount?: number; invoice_number?: string; due_date?: string; } = {};
    const lowerBody = emailBody.toLowerCase();
    const lowerSubject = subject.toLowerCase();

    const financialKeywords = ["invoice", "bill", "payment", "transaction", "receipt", "order confirmation", "statement", "due date", "amount due", "total amount"];
    const isFinancialEmail = financialKeywords.some(keyword => lowerBody.includes(keyword) || lowerSubject.includes(keyword));
    if (!isFinancialEmail) return null;
    
    functions.logger.info("Potential financial email detected. Attempting extraction...");

    const amountPattern = /(?:total|amount|balance|due)\s*[:=\-]?\s*(?:(?:RS|INR|USD|EUR|GBP)\s*|\$|€|£|₹)?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/i;
    const matchAmount = emailBody.match(amountPattern);
    if (matchAmount && matchAmount[1]) {
        financialDetails.amount = parseFloat(matchAmount[1].replace(/,/g, ''));
    }

    const invoicePattern = /(?:invoice|inv|bill|ref|po|order)[_ -]?#?\s*(\w{4,})/i;
    const matchInvoice = emailBody.match(invoicePattern);
    if (matchInvoice) {
        financialDetails.invoice_number = matchInvoice[1].trim();
    }
    
    return Object.keys(financialDetails).length > 0 ? financialDetails : null;
}

async function inputIntoYourSystem(emailId: string, userId: string, extractedData: any, from: string, subject: string): Promise<boolean> {
    if (!extractedData || !extractedData.amount) return false;
    
    const sourceMatch = from.match(/(.*)<.*>/);
    const source = sourceMatch ? sourceMatch[1].trim() : from;
    
    let category = 'Miscellaneous'; // A default category
    if(from.toLowerCase().includes('uber') || from.toLowerCase().includes('lyft')) category = 'Transport';
    if(from.toLowerCase().includes('amazon')) category = 'Shopping';
    if(subject.toLowerCase().includes('invoice')) category = 'Utilities';

    const transactionData = {
        type: 'expense',
        amount: extractedData.amount,
        category: category,
        date: Timestamp.now(),
        source: source,
        notes: `From email: "${subject}". ${extractedData.invoice_number ? `Ref: ${extractedData.invoice_number}` : ''}`,
        userId: userId,
        createdAt: Timestamp.now(),
        ocrParsed: true,
    };
    
    await db.collection('users').doc(userId).collection('transactions').add(transactionData);
    functions.logger.info(`--- Inputted transaction from Email ID: ${emailId} for User: ${userId} ---`);
    return true;
}

async function markEmailAsRead(service: any, messageId: string) {
    try {
        await service.users.messages.modify({
            userId: 'me',
            id: messageId,
            requestBody: { removeLabelIds: ['UNREAD'] }
        });
        functions.logger.info(`Email ID: ${messageId} marked as read.`);
    } catch (error) {
        functions.logger.error(`Error marking email ${messageId} as read:`, error);
    }
}

async function processUserEmails(userId: string) {
    functions.logger.info(`Starting scheduled email processing for user: ${userId}`);
    let gmailService;
    try {
        gmailService = await getGmailService(userId);
    } catch (error) {
        functions.logger.error(`Failed to get Gmail service for ${userId} during scheduled scan:`, error);
        return null;
    }

    try {
        const query = 'is:unread category:primary'; // Focus on unread primary emails
        const res = await gmailService.users.messages.list({ userId: 'me', q: query, maxResults: 20 });
        const messages = res.data.messages || [];

        if (messages.length === 0) {
            functions.logger.info(`No new unread emails for user ${userId}.`);
            return null;
        }
        functions.logger.info(`Found ${messages.length} unread messages for user ${userId}.`);

        for (const message of messages) {
            if (!message.id) continue;
            const msg = await gmailService.users.messages.get({ userId: 'me', id: message.id, format: 'full' });
            if (!msg.data.payload) continue;

            const headers = msg.data.payload.headers || [];
            const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
            const sender = headers.find((h: any) => h.name === 'From')?.value || 'Unknown Sender';
            const emailBody = getEmailBody(msg.data.payload);
            const extractedDetails = extractFinancialData(emailBody, subject);
            if (extractedDetails) {
                if (await inputIntoYourSystem(message.id, userId, extractedDetails, sender, subject)) {
                    await markEmailAsRead(gmailService, message.id);
                }
            }
        }
        functions.logger.info(`Finished scheduled email processing for user: ${userId}`);
        return null;

    } catch (error) {
        functions.logger.error(`Error processing emails for user ${userId}:`, error);
        return null;
    }
}

export const scheduledGmailScan = functions.pubsub.schedule('every 60 minutes').onRun(async () => {
    functions.logger.info('Running scheduled Gmail scan for all active users.');
    const usersSnapshot = await db.collection('gmail_tokens').where('refresh_token', '!=', null).get();
    const processPromises = usersSnapshot.docs.map(doc => processUserEmails(doc.id));
    await Promise.allSettled(processPromises);
    functions.logger.info('Scheduled Gmail scan complete.');
    return null;
});

export const onTokenUpdateScan = functions.firestore.document('gmail_tokens/{userId}').onWrite(async (change, context) => {
    const userId = context.params.userId;
    const beforeData = change.before.data();
    const afterData = change.after.data();

    // If there is no afterData, the token document was deleted, so do nothing.
    if (!afterData) return null;

    // Trigger on initial creation or if the refresh_token changes.
    if (!beforeData || beforeData.refresh_token !== afterData.refresh_token) {
        functions.logger.info(`New or updated refresh token for user ${userId}. Triggering initial email scan.`);
        await processUserEmails(userId);
    }
    
    return null;
});
