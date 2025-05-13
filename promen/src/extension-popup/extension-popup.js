// Import debug utilities
import { DEBUG, debugLog, errorLog } from '../utils/debug-config.js';

// Initial state
const state = {
  isActive: true,
  apiKey: null
};

// Element references
const elements = {
  statusIndicator: null,
  toggleBtn: null,
  toggleText: null,
  commandButtons: null,
  settingsToggleBtn: null,
  mainView: null,
  settingsView: null,
  apiKeyInput: null,
  saveApiKeyButton: null,
  apiKeyStatus: null,
  backButton: null,
  websiteBtn: null,
  reportBtn: null
};

// Initialize element references
function initializeElements() {
  elements.statusIndicator = document.querySelector('.status-indicator');
  elements.toggleBtn = document.querySelector('#toggleBtn');
  elements.toggleText = document.querySelector('.toggle-text');
  elements.commandButtons = document.querySelectorAll('.command-button');
  elements.settingsToggleBtn = document.querySelector('#settingsToggleBtn');
  elements.mainView = document.querySelector('#mainView');
  elements.settingsView = document.querySelector('#settingsView');
  elements.apiKeyInput = document.querySelector('#apiKeyInput');
  elements.saveApiKeyButton = document.querySelector('#saveApiKeyButton');
  elements.apiKeyStatus = document.querySelector('#apiKeyStatus');
  elements.backButton = document.querySelector('#backButton');
  elements.websiteBtn = document.querySelector('#websiteBtn');
  elements.reportBtn = document.querySelector('#reportBtn');

  return Object.values(elements).some(el => el !== null);
}

// Load API key from storage
async function loadApiKey() {
  try {
    const result = await chrome.storage.local.get(['apiKey']);
    state.apiKey = result.apiKey || null;
    debugLog('API key loaded from storage:', state.apiKey ? 'Present' : 'Not found');
    return state.apiKey;
  } catch (error) {
    errorLog('Error loading API key:', error);
    return null;
  }
}

// Save API key to storage
async function saveApiKey(apiKey) {
  try {
    // Save to chrome.storage.local
    await chrome.storage.local.set({ apiKey });
    
    // Update state
    state.apiKey = apiKey;
    
    // Notify background script about API key change
    try {
      await chrome.runtime.sendMessage({ 
        action: 'api_key_updated', 
        apiKey: apiKey 
      });
    } catch (error) {
      errorLog('Error notifying background script:', error);
    }
    
    debugLog('API key saved to storage:', apiKey ? 'Present' : 'Not found');
    return true;
  } catch (error) {
    errorLog('Error saving API key:', error);
    return false;
  }
}

// Update UI based on state
function updateUI() {
  try {
    // Update status indicator and toggle button
    if (elements.statusIndicator) {
      const statusText = elements.statusIndicator.querySelector('span:not(.material-icons)');
      if (statusText) statusText.textContent = state.isActive ? 'Active' : 'Inactive';
    }

    if (elements.toggleBtn && elements.toggleText) {
      elements.toggleText.textContent = state.isActive ? 'Disable' : 'Enable';
    }

    // Update command buttons
    if (elements.commandButtons) {
      elements.commandButtons.forEach(button => {
        button.disabled = !state.isActive;
      });
    }

    // Update API key status
    updateApiKeyStatus();
    debugLog('UI updated with state:', state);
  } catch (error) {
    errorLog('Error updating UI:', error);
  }
}

// Update API key status
function updateApiKeyStatus() {
  if (!elements.apiKeyStatus || !elements.apiKeyInput) return;

  if (state.apiKey) {
    elements.apiKeyStatus.textContent = 'API Key is saved';
    elements.apiKeyStatus.className = 'status-message success';
    elements.apiKeyInput.value = state.apiKey;
  } else {
    elements.apiKeyStatus.textContent = 'API Key not set';
    elements.apiKeyStatus.className = 'status-message error';
    elements.apiKeyInput.value = '';
  }
}

// Initialize event listeners
function initializeEventListeners() {
  // Toggle extension
  if (elements.toggleBtn) {
    elements.toggleBtn.addEventListener('click', () => {
      state.isActive = !state.isActive;
      chrome.storage.local.set({ isActive: state.isActive }, () => {
        debugLog('Extension state toggled:', state.isActive);
        updateUI();

        // Notify content script to update icon visibility
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: state.isActive ? 'show_icon' : 'hide_icon'
            }).catch(error => {
              errorLog('Error sending icon visibility command:', error);
            });
          }
        });
      });
    });
  }

  // Command buttons
  if (elements.commandButtons) {
    elements.commandButtons.forEach(button => {
      button.addEventListener('click', () => {
        const command = button.dataset.command;
        debugLog('Command clicked:', command);
        
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: command + '_prompt'
            }).catch(error => {
              errorLog('Error sending command:', error);
            });
          }
        });
      });
    });
  }

  // Settings navigation
  if (elements.settingsToggleBtn && elements.mainView && elements.settingsView) {
    elements.settingsToggleBtn.addEventListener('click', () => {
      elements.mainView.style.display = 'none';
      elements.settingsView.style.display = 'block';
    });
  }

  if (elements.backButton && elements.mainView && elements.settingsView) {
    elements.backButton.addEventListener('click', () => {
      elements.mainView.style.display = 'block';
      elements.settingsView.style.display = 'none';
    });
  }

  // API Key management
  if (elements.saveApiKeyButton && elements.apiKeyInput && elements.apiKeyStatus) {
    elements.saveApiKeyButton.addEventListener('click', async () => {
      const newApiKey = elements.apiKeyInput.value.trim();
      
      if (newApiKey) {
        const saved = await saveApiKey(newApiKey);
        if (saved) {
          elements.apiKeyStatus.textContent = 'API Key saved successfully!';
          elements.apiKeyStatus.className = 'status-message success';
        } else {
          elements.apiKeyStatus.textContent = 'Failed to save API Key';
          elements.apiKeyStatus.className = 'status-message error';
        }
      } else {
        const removed = await saveApiKey(null);
        if (removed) {
          elements.apiKeyStatus.textContent = 'API Key removed';
          elements.apiKeyStatus.className = 'status-message info';
        } else {
          elements.apiKeyStatus.textContent = 'Failed to remove API Key';
          elements.apiKeyStatus.className = 'status-message error';
        }
      }
    });
  }

  // Help and Report buttons
  if (elements.websiteBtn) {
    elements.websiteBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://prom10.vercel.app/' });
    });
  }

  if (elements.reportBtn) {
    elements.reportBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://forms.gle/L5Xd8z1ugnpvr6Zz8' });
    });
  }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  debugLog('Initializing extension popup...');

  // Initialize elements
  if (!initializeElements()) {
    debugLog('Failed to initialize required elements');
    return;
  }

  try {
    // Load state from storage
    const result = await chrome.storage.local.get(['isActive', 'apiKey']);
    
    // Update state with stored values
    state.isActive = result.isActive !== false;
    state.apiKey = result.apiKey || null;

    // Initialize UI and event listeners
    updateUI();
    initializeEventListeners();

    debugLog('Extension popup initialized successfully');
  } catch (error) {
    debugLog('Error initializing popup:', error);
  }
}); 