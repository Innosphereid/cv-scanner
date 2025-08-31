// Import with `const Sentry = require("@sentry/nestjs");` if you are using CJS
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

Sentry.init({
  dsn: 'https://9085f397a414fa6433f4bc54b806955a@o4509006878408704.ingest.us.sentry.io/4509913092063232',

  integrations: [
    nodeProfilingIntegration(),

    // send console.log, console.warn, and console.error calls as logs to Sentry
    Sentry.consoleLoggingIntegration({ levels: ['log', 'warn', 'error'] }),
  ],
  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Environment detection
  environment: process.env.NODE_ENV || 'development',

  // Enable debug mode to see what's happening
  debug: process.env.NODE_ENV === 'development',

  // Performance monitoring
  tracesSampleRate: 1.0,

  // Error sampling - capture all errors in development
  sampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  // Set sampling rate for profiling - this is evaluated only once per SDK.init call
  profileSessionSampleRate: 1.0,
  // Trace lifecycle automatically enables profiling during active traces
  profileLifecycle: 'trace',

  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,

  // Enable source maps for better error tracking
  attachStacktrace: true,
});
