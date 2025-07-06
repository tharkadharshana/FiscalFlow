// src/lib/logger.ts
import { getFunctions } from 'firebase/functions';
import { app, auth } from './firebase';

const functions = getFunctions(app);

// Use a generic type for the details object
type LogDetails = Record<string, any>;

const sendLog = (level: 'info' | 'warn' | 'error', message: string, details: LogDetails = {}) => {
  // Also log to console for local development
  if (process.env.NODE_ENV === 'development') {
    switch (level) {
      case 'info':
        console.info(message, details);
        break;
      case 'warn':
        console.warn(message, details);
        break;
      case 'error':
        console.error(message, details);
        break;
    }
  }
  
  // Do not send logs if user is not authenticated.
  if (!auth.currentUser) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Log not sent to server (user not authenticated): "${message}"`);
    }
    return;
  }
  
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  // This can be 'us-central1' or your function's region
  const region = functions.region || 'us-central1'; 
  const finalUrl = `https://${region}-${projectId}.cloudfunctions.net/logMessage`;

  const detailsWithUser = {
      ...details,
      userId: auth.currentUser.uid,
  };

  fetch(finalUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Sending a plain JSON body, not nested under a `data` key.
      body: JSON.stringify({ level, message, details: detailsWithUser }),
  }).catch((error) => {
      // We console.error here to avoid an infinite loop if the logging function itself fails.
      console.error('Failed to send log to server:', error);
  });
};

export const logger = {
  info: (message: string, details?: LogDetails) => {
    sendLog('info', message, details);
  },
  warn: (message: string, details?: LogDetails) => {
    sendLog('warn', message, details);
  },
  error: (message: string, error: Error, details?: LogDetails) => {
    // Standardize error logging to include stack trace
    const errorDetails = {
      ...details,
      errorMessage: error.message,
      stack: error.stack,
    };
    sendLog('error', message, errorDetails);
  },
};
