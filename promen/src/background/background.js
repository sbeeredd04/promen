// Import debug utilities
import { DEBUG, debugLog, errorLog } from '../utils/debug-config.js';

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
    errorLog('Error loading API key on install:', error);
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
    errorLog('Error loading API key:', error);
    return null;
  }
}

// Process and format response text
function processResponseText(text) {
  if (!text) return '';
  
  debugLog('Original text:', text);
  
  // Check for code blocks - we need to preserve these exactly as they are
  const codeBlocks = [];
  let codeBlockCounter = 0;
  
  // First, extract and save any code blocks to prevent modifying them
  let formattedText = text.replace(/```[\s\S]*?```|`[\s\S]*?`|<code>[\s\S]*?<\/code>/g, (match) => {
    const placeholder = `__CODE_BLOCK_${codeBlockCounter}__`;
    codeBlocks.push(match);
    codeBlockCounter++;
    return placeholder;
  });
  
  // Replace markdown-style bold with plain text
  formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '$1');
  
  // Check for structured content like numbered lists
  const hasNumberedList = /\n\s*\d+\.\s+/.test(formattedText);
  
  // Enhance formatting for easier reading - especially for numbered lists
  // We'll convert to HTML tags for better preservation
  
  // First, add DIV wrappers around list items for better identification
  formattedText = formattedText
    // First add markers for paragraph breaks
    .replace(/\n\s*\n/g, '\n---PARAGRAPH---\n')
    
    // Mark list items with an HTML class for later detection
    .replace(/(\n|^)(\d+\.\s+)(.*?)(?=\n\d+\.\s+|\n---PARAGRAPH---|\n\n|$)/gs, '\n<div class="list-item">$2$3</div>')
    
    // Convert bullet points with proper formatting
    .replace(/\n\*\s+(.*?)(?=\n\*\s+|\n---PARAGRAPH---|\n\n|$)/gs, '\n<div class="bullet-item">• $1</div>')
    
    // Now restore paragraph breaks
    .replace(/\n---PARAGRAPH---\n/g, '\n\n')
    
    // Convert all newlines to <br>
    .replace(/\n/g, '<br>')
    
    // Trim whitespace
    .replace(/^\s+|\s+$/g, '');
  
  // Debug: Check for user parts before replacement
  const userPartMatches = formattedText.match(/\[\s*user\s*part\s*:\s*(.*?)\]/gi);
  if (userPartMatches) {
    debugLog('Found user parts:', userPartMatches);
  }
  
  // Mark user parts with a special class for later styling and convert to uppercase
  // We'll be very specific with the regex to ensure it works correctly
  formattedText = formattedText.replace(/\[\s*user\s*part\s*:\s*(.*?)\]/gi, function(match, p1) {
    debugLog('Replacing user part:', { match, captured: p1 });
    return '<span class="promen-user-part">[USER PART: ' + p1 + ']</span>';
  });
  
  // Also handle the alternative format with underscores
  formattedText = formattedText.replace(/________ \((.*?)\)/g, function(match, p1) {
    debugLog('Replacing underscore format:', { match, captured: p1 });
    return '<span class="promen-user-part">[USER PART: ' + p1 + ']</span>';
  });
  
  // Now restore the code blocks - we put these in pre tags to preserve formatting
  formattedText = formattedText.replace(/__CODE_BLOCK_(\d+)__/g, (match, number) => {
    const codeBlock = codeBlocks[parseInt(number, 10)];
    // Return the code block wrapped in a pre tag to preserve formatting
    return `<pre class="promen-code-block">${codeBlock}</pre>`;
  });
  
  // If we detected numbered lists, add a debugging message
  if (hasNumberedList) {
    debugLog('Detected and formatted numbered list in response');
  }
  
  if (codeBlockCounter > 0) {
    debugLog(`Preserved ${codeBlockCounter} code blocks in the response`);
  }
  
  debugLog('Formatted text:', formattedText);
  return formattedText;
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
      errorLog('API request failed:', error);
      return { error: 'API request failed: ' + (error.error?.message || 'Unknown error') };
    }

    const data = await response.json();
    debugLog('API response received:', data);
    
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      return { error: 'Invalid API response format' };
    }

    // Process and format the response text
    const processedText = processResponseText(data.candidates[0].content.parts[0].text);
    return { text: processedText };
  } catch (error) {
    errorLog('Error making API request:', error);
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
* Clarity: Remove ambiguity and make the intent clear.
* Conciseness: Eliminate unnecessary words while preserving meaning.
* Precision: Use precise language that accurately conveys the request.
* Structure: Organize the query in a logical flow.

IMPORTANT RULES:
1. Your output must be ONLY the rephrased prompt itself. Do not include any introductory phrases, explanations, or any text other than the final, rephrased prompt ready for use.
2. If the user's query contains code blocks, data, or any content that appears to be context or examples (marked by tags like <code>, \`\`\`code\`\`\`, etc.), preserve this content EXACTLY as-is in your response.
3. Do not modify or rephrase code examples, data dumps, or content that follows phrases like "here is the code:", "here's my data:", etc.
4. Focus your rephrasing only on the instructions or requests part of the query.

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
* Specificity: Add concrete details (e.g., specific objects, numbers, names, features).
* Context: Provide background information or the purpose of the request.
* Format/Style: Define the desired output format (e.g., list, paragraph, code block), tone (e.g., formal, casual, enthusiastic), or style (e.g., photorealistic, cartoonish, academic).
* Constraints: Include limitations or specific requirements (e.g., word count, elements to avoid, technical specifications).
* Perspective/Audience: Specify the viewpoint or intended audience if relevant.

If critical information is missing that only the original user can provide (e.g., specific preferences, key details, subjective choices), insert a placeholder formatted exactly as \`[USER PART: Describe the missing information needed]\`. Use these placeholders judiciously only for essential gaps that require user input.

IMPORTANT RULES:
1. Your output must be ONLY the enhanced prompt itself. Do not include any introductory phrases, explanations, apologies, confirmations, or any text other than the final, enhanced prompt.
2. If the user's query contains code blocks, data, or any content that appears to be context or examples (marked by tags like <code>, \`\`\`code\`\`\`, etc.), preserve this content EXACTLY as-is in your response.
3. Do not modify or rephrase code examples, data dumps, or content that follows phrases like "here is the code:", "here's my data:", etc.
4. Focus your enhancements only on the instructions or requests part of the query.

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
        errorLog('Error processing message:', error);
        sendResponse({ error: 'Internal error: ' + error.message });
      }
    })();
    return true; // Will respond asynchronously
  }
}); 