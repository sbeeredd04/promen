// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'popupOpened') {
    // Store the text for the popup to use
    chrome.storage.local.set({ currentText: message.text });
  }
});

// Initialize API key on extension install or update
chrome.runtime.onInstalled.addListener(async () => {
  try {
    // Check if API key exists
    const result = await chrome.storage.local.get(['apiKey']);
    if (!result.apiKey) {
      // Initialize with null API key
      await chrome.storage.local.set({ apiKey: null });
    }
  } catch (error) {
    console.error('Error initializing API key:', error);
  }
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.apiKey) {
    // API key was updated, notify all tabs
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'apiKeyUpdated',
          apiKey: changes.apiKey.newValue
        }).catch(() => {
          // Ignore errors for tabs that can't receive messages
        });
      });
    });
  }
});
