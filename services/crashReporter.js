/**
 * RIFT — Crash Reporter (lightweight)
 * Captures global JS errors and forwards to analytics stream.
 */

import { trackAnalyticsEvent } from './analyticsService';

let initialized = false;

export function initCrashReporter() {
  if (initialized) return;
  initialized = true;

  // React Native global handler (if available)
  const errorUtils = global.ErrorUtils;
  if (errorUtils?.getGlobalHandler && errorUtils?.setGlobalHandler) {
    const defaultHandler = errorUtils.getGlobalHandler();
    errorUtils.setGlobalHandler((error, isFatal) => {
      trackAnalyticsEvent('app_error', {
        message: String(error?.message || error),
        stack: String(error?.stack || ''),
        fatal: Boolean(isFatal),
      });

      if (defaultHandler) {
        defaultHandler(error, isFatal);
      }
    });
  }
}
