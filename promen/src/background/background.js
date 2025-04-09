// Debug mode
const DEBUG = true;

// Debug logging helper
function debugLog(message, data = null) {
  if (DEBUG) {
    console.log(`[Promen Debug] ${message}`, data || '');
  }
}

// Constants
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const API_KEY_PARAM = 'key';

// State
let state = {
  apiKey: null
};

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  debugLog('Extension installed/updated');
  
  try {
    // Load API key from storage
    const result = await chrome.storage.local.get(['apiKey']);
    state.apiKey = result.apiKey || null;
    debugLog('API key loaded on install:', state.apiKey ? 'Present' : 'Not found');
  } catch (error) {
    debugLog('Error loading API key on install:', error);
  }
});

// Get API key from storage
async function getApiKey() {
  try {
    const result = await chrome.storage.local.get(['apiKey']);
    state.apiKey = result.apiKey || null;
    debugLog('API key loaded from storage:', state.apiKey ? 'Present' : 'Not found');
    return state.apiKey;
  } catch (error) {
    debugLog('Error loading API key:', error);
    return null;
  }
}

// Make API request to Gemini
async function makeGeminiRequest(prompt) {
  if (!state.apiKey) {
    debugLog('No API key available');
    return { error: 'API key not set' };
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}?${API_KEY_PARAM}=${state.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      debugLog('API request failed:', error);
      return { error: 'API request failed: ' + (error.error?.message || 'Unknown error') };
    }

    const data = await response.json();
    debugLog('API response received:', data);
    
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      return { error: 'Invalid API response format' };
    }

    return { text: data.candidates[0].content.parts[0].text };
  } catch (error) {
    debugLog('Error making API request:', error);
    return { error: 'Failed to make API request: ' + error.message };
  }
}

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  debugLog('Message received:', message);

  // Handle API key updates
  if (message.action === 'api_key_updated') {
    state.apiKey = message.apiKey;
    debugLog('API key updated:', state.apiKey ? 'Present' : 'Not found');
    return;
  }

  // Handle content script requests
  if (sender.tab) {
    (async () => {
      try {
        // Ensure we have the latest API key
        await getApiKey();

        if (!state.apiKey) {
          sendResponse({ error: 'API key not set' });
          return;
        }

        let prompt = '';
        switch (message.action) {
          case 'rephrase_prompt':
            if (!message.text) {
              sendResponse({ error: 'No text provided' });
              return;
            }
            prompt = `Rephrase the following text to be more clear and concise: "${message.text}"`;
            break;
          case 'enhance_prompt':
            if (!message.text) {
              sendResponse({ error: 'No text provided' });
              return;
            }
            prompt = `Enhance the following text to be more detailed and professional: "${message.text}"`;
            break;
          default:
            sendResponse({ error: 'Unknown action' });
            return;
        }

        const result = await makeGeminiRequest(prompt);
        sendResponse(result);
      } catch (error) {
        debugLog('Error processing message:', error);
        sendResponse({ error: 'Internal error: ' + error.message });
      }
    })();
    return true; // Will respond asynchronously
  }
}); 