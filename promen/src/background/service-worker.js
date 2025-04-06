// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'popupOpened') {
    // Store the text for the popup to use
    chrome.storage.local.set({ currentText: message.text });
  }
});
