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
            prompt = `Act as a Prompt Rephraser. Your goal is to rewrite the user's initial query to make it clearer, more concise, and more effective for an AI model.

Analyze the user's query. Identify areas where clarity, brevity, or precision can be improved.

Rewrite the query, incorporating improvements such as:
* **Clarity:** Remove ambiguity and make the intent clear.
* **Conciseness:** Eliminate unnecessary words while preserving meaning.
* **Precision:** Use precise language that accurately conveys the request.
* **Structure:** Organize the query in a logical flow.

Your output must be ONLY the rephrased prompt itself. Do not include any introductory phrases, explanations, or any text other than the final, rephrased prompt ready for use. Start the output directly with the rephrased prompt text.

--- User Query Below ---

${message.text}`;
            break;
          case 'enhance_prompt':
            if (!message.text) {
              sendResponse({ error: 'No text provided' });
              return;
            }
            prompt = `Act as a Prompt Enhancer. Your goal is to rewrite and expand upon the user's initial query to make it significantly more detailed, specific, and effective for an AI model.

Analyze the user's query. Identify areas where more detail, context, clarification, or specific instruction is needed for a high-quality result.

Rewrite the query, incorporating enhancements such as:
* **Specificity:** Add concrete details (e.g., specific objects, numbers, names, features).
* **Context:** Provide background information or the purpose of the request.
* **Format/Style:** Define the desired output format (e.g., list, paragraph, code block), tone (e.g., formal, casual, enthusiastic), or style (e.g., photorealistic, cartoonish, academic).
* **Constraints:** Include limitations or specific requirements (e.g., word count, elements to avoid, technical specifications).
* **Perspective/Audience:** Specify the viewpoint or intended audience if relevant.

If critical information is missing that only the original user can provide (e.g., specific preferences, key details, subjective choices), insert a placeholder formatted exactly as \`[user part: Describe the missing information needed]\`. Alternatively, you may use \`________ (Describe the missing information needed)\` if it fits the sentence structure better, but prioritize the \`[user part: ...]\` format. Use these placeholders judiciously only for essential gaps that require user input.

**Crucially, your output must be ONLY the enhanced prompt itself.** Do not include any introductory phrases ("Here is the enhanced prompt:", "Okay, here you go:", etc.), explanations, apologies, confirmations, or any text other than the final, enhanced prompt ready for use. Start the output directly with the enhanced prompt text.

--- User Query Below ---

${message.text}`;
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