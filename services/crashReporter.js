/**
 * RIFT — Crash Reporter (lightweight)
 * Captures global JS errors and forwards to analytics stream.
 */

import { trackAnalyticsEvent } from './analyticsService';

let initialized = false;
let handlerActive = false; // re-entrancy guard

export function initCrashReporter() {
  if (initialized) return;
  initialized = true;

  // React Native global handler (if available)
  const errorUtils = global.ErrorUtils;
  if (errorUtils?.getGlobalHandler && errorUtils?.setGlobalHandler) {
    const defaultHandler = errorUtils.getGlobalHandler();
    errorUtils.setGlobalHandler((error, isFatal) => {
      if (!handlerActive) {
        handlerActive = true;
        try {
          trackAnalyticsEvent('app_error', {
            message: String(error?.message || error),
            stack: String(error?.stack || '').slice(0, 2000),
            fatal: Boolean(isFatal),
          });
        } catch {
          // analytics must never re-throw inside the global error handler
        } finally {
          handlerActive = false;
        }
      }

      if (defaultHandler) {
        defaultHandler(error, isFatal);
      }
    });
  }
}
