// Import necessary components if using a bundled SDK or module
// Example: import { GoogleGenerativeAI } from './libs/google-genai.js'; 

// Debug mode
const DEBUG = true;

// Debug logging helper
function debugLog(message, data) {
  if (DEBUG) {
    console.log(`[Promen Background] ${message}`, JSON.stringify(data)); // Stringify for better object logging
  }
}

// --- Constants ---
const GEMINI_MODEL = "gemini-2.0-flash"; // Or your preferred model

// --- Initialization ---
chrome.runtime.onInstalled.addListener((details) => {
  debugLog('onInstalled event', details);
  chrome.storage.local.set({
    isActive: true,
    apiKey: null
  }, () => {
    debugLog('Initial state set', { isActive: true, apiKey: null });
  });
});

// --- Utility Functions ---
async function getApiKey() {
  const result = await chrome.storage.local.get('apiKey');
  return result.apiKey;
}

// --- Gemini API Calls (Structured Placeholders) ---

// Initialize AI Client (Needs API Key - potentially re-initialize if key changes)
let genAI = null;
let generativeModel = null;

async function initializeGenAI() {
    const apiKey = await getApiKey();
    if (apiKey && typeof GoogleGenerativeAI !== 'undefined') { // Check if SDK is loaded
        try {
            genAI = new GoogleGenerativeAI(apiKey);
            generativeModel = genAI.getGenerativeModel({ model: GEMINI_MODEL });
            debugLog('Gemini AI SDK Initialized successfully', { model: GEMINI_MODEL });
            return true;
        } catch (error) {
            console.error("[Promen Error] Failed to initialize GoogleGenerativeAI:", error);
            genAI = null;
            generativeModel = null;
            return false;
        }
    } else {
        debugLog('Gemini AI SDK NOT Initialized', { hasApiKey: !!apiKey, sdkLoaded: typeof GoogleGenerativeAI !== 'undefined' });
        genAI = null;
        generativeModel = null;
        return false;
    }
}

// Re-initialize when API key changes
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.apiKey) {
        debugLog('API Key changed, re-initializing Gemini SDK');
        initializeGenAI();
    }
});

// Placeholder: Function to make the actual API call
async function generateContentWithGemini(requestPayload) {
    if (!generativeModel) {
        debugLog('Attempted API call, but model not initialized. Trying to initialize...');
        const initialized = await initializeGenAI();
        if (!initialized) {
            return { error: "API Key not set or SDK not loaded." };
        }
    }

    debugLog('Sending request to Gemini', { model: GEMINI_MODEL, contents: requestPayload.contents });

    try {
        // Example uses generateContent, adjust if using chat or streaming
        const result = await generativeModel.generateContent(requestPayload);
        const response = await result.response; 
        const text = response.text();
        debugLog('Received response from Gemini', { text });
        return { text };
    } catch (error) {
        console.error("[Promen Error] Gemini API call failed:", error);
        // Handle specific API errors (e.g., quota, invalid key) if possible
        return { error: `Gemini API Error: ${error.message}` };
    }
}

// --- Feature Implementations ---

async function handleRephrase(promptText) {
    const systemInstruction = "You are a concise rephrasing assistant. Given text, rewrite it clearly and simply without changing the core meaning. Do not add explanations or commentary.";
    const request = {
        contents: [{ role: "user", parts: [{ text: promptText }] }],
        systemInstruction: { parts: [{ text: systemInstruction }] }
        // Add generationConfig if needed (temperature, maxTokens, etc.)
    };
    const result = await generateContentWithGemini(request);
    return { rephrased: result.text, error: result.error };
}

async function handleEnhance(promptText) {
    const systemInstruction = `You are a prompt enhancement assistant. 
    Analyze the user's input and transform it into a highly detailed and effective prompt suitable for a large language model. 
    Identify key areas where more information is needed and represent these as clearly marked fill-in-the-blank sections like [Specify Target Audience] or [Describe Desired Tone]. 
    Structure the output logically. Do not add conversational filler.`;
    const request = {
        contents: [{ role: "user", parts: [{ text: promptText }] }],
        systemInstruction: { parts: [{ text: systemInstruction }] }
    };
    const result = await generateContentWithGemini(request);
    return { enhanced: result.text, error: result.error };
}

async function handleAgent(chatHistory) {
    // For agent, we'd likely use the chat interface if SDK is available
    // Placeholder using generateContent for now
    const systemInstruction = "You are a helpful AI assistant named Promen Agent, skilled at helping users craft the perfect prompt by asking clarifying questions. Keep responses conversational and focused on gathering necessary details.";
    
    // Format history for generateContent (or use chat.sendMessage if SDK works)
    const formattedContents = chatHistory.map(msg => ({ 
        role: msg.role === 'user' ? 'user' : 'model', 
        parts: [{ text: msg.content }] 
    }));

    const request = {
        contents: formattedContents,
        systemInstruction: { parts: [{ text: systemInstruction }] }
    };
    const result = await generateContentWithGemini(request);
    return { response: result.text, error: result.error };
}

// --- Message Listener ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    debugLog('Message received', { message, sender });
  
    (async () => {
        let response = {};
        const text = message.text || ''; // Get text from message if provided

        try {
            switch (message.action) {
                case 'rephrase_prompt':
                    if (!text) { response = { error: "No text provided for rephrasing." }; break; }
                    response = await handleRephrase(text);
                    break;
                
                case 'enhance_prompt':
                    if (!text) { response = { error: "No text provided for enhancement." }; break; }
                    response = await handleEnhance(text);
                    break;
                
                case 'agent_prompt':
                    // Needs history management - simplified for now
                    debugLog('Agent command received - placeholder');
                    response = { agentStarted: true, initialMessage: "Hi! How can I help you craft the perfect prompt?" }; 
                    // const agentResponse = await handleAgent([{ role: 'user', content: text }]);
                    // response = { response: agentResponse.response, error: agentResponse.error };
                    break;
                    
                default:
                    debugLog('Unknown action received in background', { action: message.action });
                    response = { error: 'Unknown background action' };
            }
        } catch (error) {
            console.error('[Promen Error] Failed to handle message:', error);
            response = { error: `Internal background error: ${error.message}` };
        }
        debugLog('Sending response', response);
        sendResponse(response);
    })();
  
    return true; // Keep connection open for async response
});

// --- Command Listener ---
chrome.commands.onCommand.addListener((command) => {
    debugLog('Keyboard command received', { command });
  
    (async () => {
        // Get active tab to send message back for context/insertion
        let activeTab;
        try {
             const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
             activeTab = tabs[0];
        } catch (err) {
             console.error("[Promen Error] Could not query active tab for command:", err);
             return;
        }

        if (!activeTab || !activeTab.id) {
            console.error("[Promen Error] No active tab found for command processing.");
            return;
        }
        
        // Request text content from content script before calling API
        try {
            const content = await chrome.tabs.sendMessage(activeTab.id, { action: 'get_selected_or_focused_text' });
            const textToProcess = content?.text || ""; // Use selected/focused text
            debugLog('Text received from content script for command', { command, textLength: textToProcess.length });

            let apiResponse = {};
            switch (command) {
                case 'enhance_prompt':
                    apiResponse = await handleEnhance(textToProcess);
                    break;
                case 'rephrase_prompt':
                    apiResponse = await handleRephrase(textToProcess);
                    break;
                case 'agent_prompt':
                    debugLog('Agent command via shortcut - TBD');
                    // Perhaps open the popup? chrome.action.openPopup();
                    apiResponse = { info: 'Agent shortcut TBD' }; // Placeholder
                    break;
                default:
                     apiResponse = { error: 'Unknown command' };
            }

            // Send the result back to the content script
            if (activeTab && activeTab.id && command !== 'agent_prompt') { // Don't send agent response back yet
                 debugLog('Sending API response back to content script', { command, apiResponse });
                 chrome.tabs.sendMessage(activeTab.id, { 
                     action: 'api_response', 
                     command: command,
                     response: apiResponse 
                 });
            }

        } catch (error) {
            console.error(`[Promen Error] Failed processing command ${command}:`, error);
            // Maybe notify the user via the content script?
             if (activeTab && activeTab.id) {
                 chrome.tabs.sendMessage(activeTab.id, { 
                     action: 'api_response', 
                     command: command, 
                     response: { error: `Error processing shortcut: ${error.message}` } 
                 });
             }
        }
    })();
});

// Attempt to initialize SDK on startup
initializeGenAI(); 