// src/lib/logger.ts
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, auth } from './firebase';

const functions = getFunctions(app);

// Use a generic type for the details object
type LogDetails = Record<string, any>;

const logMessage = httpsCallable<{ level: string; message: string; details: LogDetails }, { success: boolean }>(functions, 'logMessage');

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

  // Send log to the cloud function
  logMessage({ level, message, details }).catch((error) => {
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
