// Debug mode
const DEBUG = true;

// Debug logging helper
function debugLog(message, data) {
  if (DEBUG) {
    console.log(`[Promen Debug] ${message}`, data);
  }
}

// Load a module from extension URL
async function loadModule(path) {
  const url = chrome.runtime.getURL(path);
  try {
    return await import(url);
  } catch (error) {
    console.error(`[Promen Error] Failed to load module ${path}:`, error);
    throw error;
  }
}

// Initialize the content script
async function initialize() {
  debugLog('Content script loader starting...');
  
  try {
    // Load modules
    const domHelper = await loadModule('src/utils/dom-helper.js');
    const injectUI = await loadModule('src/content-scripts/inject-ui.js');
    
    debugLog('Modules loaded:', {
      domHelper: !!domHelper,
      injectUI: !!injectUI
    });
    
    // Initialize UI
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        injectUI.initialize();
      });
    } else {
      injectUI.initialize();
    }
    
    // Export debug object to window
    window.__promenDebug = injectUI.debug;
    
    debugLog('Content script loader complete');
  } catch (error) {
    console.error('[Promen Error] Failed to initialize content script:', error);
  }
}

// Start initialization
initialize(); 