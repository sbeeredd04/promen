/**
 * Debug Configuration for Promen Extension
 * 
 * This file centralizes debug mode configuration for the entire extension.
 * Set DEBUG to false in production to disable console logging for security reasons.
 */

// Debug mode master switch
export const DEBUG = false;

// Debug logging helper function
export function debugLog(message, data = null) {
  if (DEBUG) {
    console.log(`[Promen Debug] ${message}`, data || '');
  }
}

// Error logging - always enabled for critical errors
export function errorLog(message, error = null) {
  console.error(`[Promen Error] ${message}`, error || '');
}

// Initialize debug settings from storage
export async function initializeDebugSettings() {
  if (!chrome || !chrome.storage) return;
  
  try {
    const result = await chrome.storage.local.get(['debugMode']);
    // Only update if explicitly set, otherwise use the default
    if (typeof result.debugMode === 'boolean') {
      // We can't modify the exported const, but we can update internal state
      // that's used by the logging functions
      updateDebugState(result.debugMode); 
    }
  } catch (error) {
    console.error('[Promen Error] Failed to initialize debug settings:', error);
  }
}

// Internal state
let _debugEnabled = DEBUG;

// Update debug state - can be called to change the debug state at runtime
export function updateDebugState(enabled) {
  _debugEnabled = enabled;
  // Expose debug state for detection
  window.__promenDebugMode = _debugEnabled;
}

// Override the debugLog function reference to use the internal state
// This is needed because we can't modify the exported const
debugLog = function(message, data = null) {
  if (_debugEnabled) {
    console.log(`[Promen Debug] ${message}`, data || '');
  }
}; 