// Import utilities
import { isTextInput } from '../utils/dom-helper.js';
// Debug mode
const DEBUG = false;

// Debug logging helper
function debugLog(message, data) {
  if (DEBUG) {
    console.log(`[Promen Debug] ${message}`, data);
  }
}

let currentIcon = null;
let currentPopup = null;
let activeElement = null;

// Create icon element
function createIcon() {
  const icon = document.createElement('div');
  icon.className = 'promen-icon-container';

  const img = document.createElement('img');
  img.src = chrome.runtime.getURL('icons/icon16.png');
  img.alt = 'Promen Icon';
  img.className = 'injected-icon';
  img.style.width = '16px'; // Ensure size is appropriate
  img.style.height = '16px';

  icon.appendChild(img);

  return icon;
}

// Create popup element
function createPopup() {
  const popup = document.createElement('div');
  popup.className = 'promen-popup';
  
  // Detect OS for shortcut display
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const enhanceShortcut = isMac ? 'Cmd+Shift+L' : 'Ctrl+Shift+L';
  const rephraseShortcut = isMac ? 'Cmd+Shift+K' : 'Ctrl+Shift+K';
  const agentShortcut = isMac ? 'Cmd+Shift+U' : 'Ctrl+Shift+U';

  popup.innerHTML = `
    <div class="popup-header">
      <div class="header-title">
        <div class="header-left">
          <img src="${chrome.runtime.getURL('icons/icon16.png')}" alt="Promen" class="logo">
          <h2>Promen</h2>
        </div>
        <span class="beta-tag">BETA</span>
      </div>
    </div>
    
    <div class="content">
      <div class="text-preview" id="textPreview"></div>
      
      <div class="action-group">
        <div class="action-group-title">Actions</div>
        <div class="action-row">
          <button class="command-button" data-command="enhance">
            <span class="material-icons">auto_fix_high</span>
            Enhance
            <span class="shortcut">${enhanceShortcut}</span>
          </button>
        </div>
        <div class="action-row">
          <button class="command-button" data-command="rephrase">
            <span class="material-icons">autorenew</span>
            Rephrase
            <span class="shortcut">${rephraseShortcut}</span>
          </button>
        </div>
        <div class="action-row">
          <button class="command-button" data-command="agent">
            <span class="material-icons">smart_toy</span>
            Agent
            <span class="shortcut">${agentShortcut} (Soon!)</span>
          </button>
        </div>
      </div>
    </div>
  `;

  return popup;
}

// Function to handle user part replacements
function setupUserPartInteractions(element) {
  // Only works on contenteditable elements directly
  if (!element.isContentEditable) return;
  
  const userParts = element.querySelectorAll('.promen-user-part');
  debugLog('Found user parts for interaction:', userParts.length);
  
  userParts.forEach(userPart => {
    userPart.setAttribute('contenteditable', 'true');
    
    // Focus and select all text when clicking on the user part
    userPart.addEventListener('click', (e) => {
      e.stopPropagation();
      
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(userPart);
      selection.removeAllRanges();
      selection.addRange(range);
    });
    
    // Remove the placeholder when user starts typing
    userPart.addEventListener('input', () => {
      const text = userPart.textContent.trim();
      
      // Check if the user has modified the placeholder text
      if (!text.includes('[USER PART:') && !text.includes('[user part:')) {
        debugLog('User part modified, removing special styling');
        // Replace the span with just its text content
        const replacementText = document.createTextNode(userPart.textContent);
        userPart.parentNode.replaceChild(replacementText, userPart);
      }
    });
    
    // Handle enter key to complete editing
    userPart.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        userPart.blur();
        
        const text = userPart.textContent.trim();
        
        // Check if the user has modified the placeholder text
        if (!text.includes('[USER PART:') && !text.includes('[user part:')) {
          debugLog('User part completed with Enter, removing special styling');
          // Replace the span with just its text content
          const replacementText = document.createTextNode(userPart.textContent);
          userPart.parentNode.replaceChild(replacementText, userPart);
        }
      }
    });
  });
}

// Handle command execution
async function executeCommand(command) {
  if (!activeElement) return;
  
  const text = activeElement.value || activeElement.textContent || '';
  if (!text) return;

  try {
    // Show loading state
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'promen-loading';
    loadingIndicator.textContent = 'Processing...';
    activeElement.parentNode.appendChild(loadingIndicator);

    // Check if extension is still valid
    try {
      // First check if the extension is still valid
      await chrome.runtime.getURL('');
    } catch (error) {
      console.error('Extension context invalidated:', error);
      showError('Extension has been reloaded. Please refresh the page.');
      loadingIndicator.remove();
      return;
    }

    // Send message to background script with retry logic
    let response = null;
    let retries = 3;
    
    while (retries > 0 && !response) {
      try {
        response = await chrome.runtime.sendMessage({
          action: command + '_prompt',
          text: text
        });
      } catch (error) {
        console.error(`Communication error (${retries} retries left):`, error);
        retries--;
        
        if (retries === 0) {
          showError('Failed to communicate with the extension. Please try again later.');
          loadingIndicator.remove();
          return;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Remove loading indicator
    loadingIndicator.remove();

    if (response.error) {
      console.error('Command error:', response.error);
      showError(response.error);
      return;
    }

    // Store original text for rejection
    const originalText = activeElement.value || activeElement.textContent || '';
    
    // Update text field with new text
    if (activeElement.value !== undefined) {
      // For regular input/textarea fields, we need to handle the HTML differently
      // Create a temporary div to extract the text content while preserving line breaks
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = response.text;
      
      // For normal text inputs, we still need to add style to make USER PART stand out
      // First extract all user parts text from spans
      const userParts = tempDiv.querySelectorAll('.promen-user-part');
      const userPartTexts = [];
      
      debugLog('Found user parts in input field response:', userParts.length);
      
      // Replace the spans with their text content in the temp div
      userParts.forEach(userPart => {
        // Extract the original user part text (already in uppercase from the background script)
        const userPartText = userPart.textContent;
        userPartTexts.push(userPartText);
        
        // For regular inputs, we need plain text but still want to make it visually distinct
        // with brackets, uppercase and spacing consistent
        const formattedUserPart = userPartText.replace(/\[\s*USER\s*PART\s*:\s*(.*?)\]/gi, '[USER PART: $1]');
        
        // Replace the span with properly formatted text
        const textNode = document.createTextNode(formattedUserPart);
        userPart.parentNode.replaceChild(textNode, userPart);
      });
      
      // Handle special formatting for textarea fields
      let plainText = '';
      
      if (activeElement.tagName === 'TEXTAREA') {
        // Keep better formatting for lists in textareas
        
        // First handle code blocks - we want to preserve their formatting
        const codeBlocks = tempDiv.querySelectorAll('.promen-code-block');
        const savedCodeBlocks = [];
        
        codeBlocks.forEach((block, index) => {
          // Save the code block with a placeholder
          const placeholder = `__CODE_BLOCK_${index}__`;
          savedCodeBlocks.push({
            placeholder,
            content: block.textContent
          });
          
          // Replace with the placeholder
          const textNode = document.createTextNode(placeholder);
          block.parentNode.replaceChild(textNode, block);
        });
        
        // Process list items
        const listItems = tempDiv.querySelectorAll('.list-item');
        listItems.forEach(item => {
          // Replace with properly formatted text
          const textContent = item.textContent.trim();
          const paragraph = document.createElement('p');
          paragraph.textContent = textContent;
          item.parentNode.replaceChild(paragraph, item);
        });
        
        // Process bullet items
        const bulletItems = tempDiv.querySelectorAll('.bullet-item');
        bulletItems.forEach(item => {
          // Replace with properly formatted text
          const textContent = item.textContent.trim();
          const paragraph = document.createElement('p');
          paragraph.textContent = textContent;
          item.parentNode.replaceChild(paragraph, item);
        });
        
        // Convert HTML to text with proper line breaks
        plainText = tempDiv.innerHTML
          // Replace div and p tags with proper line breaks
          .replace(/<\/(div|p)>/gi, '\n')
          .replace(/<(div|p|br)[^>]*>/gi, '')
          // Replace all HTML tags
          .replace(/<[^>]*>/g, '')
          // Clean up multiple line breaks
          .replace(/\n\s*\n/g, '\n\n')
          // Decode HTML entities
          .replace(/&nbsp;/g, ' ')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          // Trim extra whitespace
          .trim();
        
        // Now restore the code blocks with proper formatting
        savedCodeBlocks.forEach(({ placeholder, content }) => {
          // Add code block markers and format with proper spacing
          const formattedCode = '\n\n```\n' + content + '\n```\n\n';
          plainText = plainText.replace(placeholder, formattedCode);
        });
          
        debugLog('Processed textarea format with code blocks:', { 
          original: response.text.substring(0, 100) + '...',
          plainText: plainText.substring(0, 100) + '...',
          codeBlocks: savedCodeBlocks.length
        });
      } else {
        // For regular input fields, use a simpler approach
        const textExtractor = document.createElement('div');
        textExtractor.innerHTML = tempDiv.innerHTML;
        plainText = textExtractor.textContent;
      }
      
      // Set the plain text value
      activeElement.value = plainText;
      
      // For textarea and input elements, we can't add styling directly
      // Instead, we'll create a visual overlay with the styled text if needed
      if (userPartTexts.length > 0 && (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT')) {
        // Create a notification about user parts that need attention
        const userPartNotification = document.createElement('div');
        userPartNotification.className = 'promen-user-part-notification';
        userPartNotification.textContent = `Your prompt contains ${userPartTexts.length} part(s) that need your input. Look for text in [USER PART: ...] format.`;
        userPartNotification.style.position = 'absolute';
        userPartNotification.style.top = `${activeElement.getBoundingClientRect().bottom + window.scrollY + 5}px`;
        userPartNotification.style.left = `${activeElement.getBoundingClientRect().left + window.scrollX}px`;
        userPartNotification.style.background = 'rgba(255, 77, 77, 0.1)';
        userPartNotification.style.color = '#ff4d4d';
        userPartNotification.style.padding = '8px 12px';
        userPartNotification.style.borderRadius = '4px';
        userPartNotification.style.fontSize = '14px';
        userPartNotification.style.zIndex = '10000';
        userPartNotification.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        
        document.body.appendChild(userPartNotification);
        
        // Remove after 5 seconds
        setTimeout(() => {
          userPartNotification.remove();
        }, 5000);
      }
    } else {
      // For contenteditable elements, we can use HTML content directly
      activeElement.innerHTML = response.text;
      
      // Setup interactions for user parts
      setupUserPartInteractions(activeElement);
    }

    // Create buttons container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'promen-ghost-buttons';

    // Add approve/reject buttons with Material Icons
    const approveBtn = document.createElement('button');
    approveBtn.className = 'promen-approve-btn';
    approveBtn.innerHTML = '<span class="material-icons">check</span>';
    approveBtn.title = 'Accept suggestion';

    const rejectBtn = document.createElement('button');
    rejectBtn.className = 'promen-reject-btn';
    rejectBtn.innerHTML = '<span class="material-icons">close</span>';
    rejectBtn.title = 'Reject suggestion';

    // Add buttons to container
    buttonContainer.appendChild(approveBtn);
    buttonContainer.appendChild(rejectBtn);

    // Position buttons above the input
    const rect = activeElement.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    // Calculate position to show above the input
    buttonContainer.style.position = 'absolute';
    buttonContainer.style.top = `${rect.top + scrollTop - buttonContainer.offsetHeight - 10}px`;
    buttonContainer.style.right = `${rect.left + scrollLeft}px`;
    buttonContainer.style.width = 'auto';
    buttonContainer.style.zIndex = '10000';

    // Add to document
    document.body.appendChild(buttonContainer);

    // Handle approve/reject
    approveBtn.addEventListener('click', () => {
      buttonContainer.remove();
    });

    rejectBtn.addEventListener('click', () => {
      // Restore original text
      if (activeElement.value !== undefined) {
        activeElement.value = originalText;
      } else {
        // For contenteditable elements, maintain proper HTML formatting for the original text
        // Check if the original text has HTML tags
        if (/<[a-z][\s\S]*>/i.test(originalText)) {
          activeElement.innerHTML = originalText;
        } else {
          activeElement.textContent = originalText;
        }
      }
      buttonContainer.remove();
    });

  } catch (error) {
    console.error('Failed to execute command:', error);
    showError('Failed to process request. Please try again.');
  }
}

// Show error message
function showError(message) {
  const errorElement = document.createElement('div');
  errorElement.className = 'promen-error';
  errorElement.textContent = message;
  
  // Position error message
  const rect = activeElement.getBoundingClientRect();
  errorElement.style.position = 'absolute';
  errorElement.style.top = `${rect.bottom + window.scrollY + 5}px`;
  errorElement.style.left = `${rect.left + window.scrollX}px`;
  errorElement.style.zIndex = '10000';
  
  document.body.appendChild(errorElement);
  
  // Remove after 3 seconds
  setTimeout(() => {
    errorElement.remove();
  }, 3000);
}

// Show popup
function showPopup(iconElement) {
  if (currentPopup) {
    currentPopup.remove();
  }

  const popup = createPopup();
  
  // Update text preview
  const textPreview = popup.querySelector('#textPreview');
  const text = activeElement.value || activeElement.textContent || '';
  textPreview.textContent = text.length > 150 ? text.substring(0, 150) + '...' : text;
  
  // Position popup above the icon
  const rect = iconElement.getBoundingClientRect();
  popup.style.position = 'fixed';
  popup.style.zIndex = '40';
  
  // Calculate position to keep popup in view
  const spaceAbove = rect.top;
  const spaceBelow = window.innerHeight - rect.bottom;
  
  if (spaceAbove > 350 || spaceAbove > spaceBelow) {
    // Position above
    popup.style.bottom = `${window.innerHeight - rect.top + 8}px`;
    popup.style.left = `${Math.max(8, rect.left)}px`;
    popup.classList.add('popup-above');
  } else {
    // Position below
    popup.style.top = `${rect.bottom + 8}px`;
    popup.style.left = `${Math.max(8, rect.left)}px`;
    popup.classList.add('popup-below');
  }
  
  document.body.appendChild(popup);
  currentPopup = popup;
  
  // Force a reflow before adding the show class
  popup.offsetHeight;
  requestAnimationFrame(() => {
    popup.classList.add('show');
  });

  // Add click handlers for commands
  popup.querySelectorAll('.command-button').forEach(button => {
    button.addEventListener('click', () => {
      const command = button.dataset.command;
      executeCommand(command);
      popup.remove();
      currentPopup = null;
    });
  });

  // Close popup when clicking outside
  document.addEventListener('click', function closePopup(e) {
    if (!popup.contains(e.target) && !iconElement.contains(e.target)) {
      popup.remove();
      currentPopup = null;
      document.removeEventListener('click', closePopup);
    }
  });

  // Handle keyboard shortcuts
  document.addEventListener('keydown', function handleShortcut(e) {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifierKey = isMac ? e.metaKey : e.ctrlKey;

    if (modifierKey && e.shiftKey) {
      const key = e.key.toUpperCase();
      let command = null;
      
      switch (key) {
        case 'L': command = 'enhance'; break;
        case 'K': command = 'rephrase'; break;
        case 'U': command = 'agent'; break; // Agent shortcut
      }
      
      if (command) {
        e.preventDefault();
        executeCommand(command);
        if (currentPopup) {
          currentPopup.remove();
          currentPopup = null;
        }
        document.removeEventListener('keydown', handleShortcut);
      }
    }
  });
}

// Update icon position
function updateIconPosition(element) {
  if (!element || !isTextInput(element)) return;
  
  if (!currentIcon || activeElement !== element) {
    activeElement = element;
    
    if (currentIcon) {
      currentIcon.remove();
    }
    if (currentPopup) {
      currentPopup.remove();
      currentPopup = null;
    }

    const icon = createIcon();
    
    // Position icon
    icon.style.position = 'absolute';
    icon.style.top = '2px';
    icon.style.right = '8px';
    icon.style.zIndex = '40';
    
    // Ensure parent has relative positioning
    const parent = element.parentElement;
    if (parent && window.getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }
    
    // Add icon to parent
    parent.appendChild(icon);
    currentIcon = icon;
    
    // Handle icon click
    icon.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showPopup(icon);
    });
  }
}

// Initialize
export function initialize() {
  debugLog('Initializing inject-ui script...');
  
  // Add Material Icons
  const link = document.createElement('link');
  link.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
  link.rel = 'stylesheet';
  document.head.appendChild(link);
  
  // Add Ubuntu Mono font
  const fontLink = document.createElement('link');
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Ubuntu+Mono:wght@400;700&display=swap';
  fontLink.rel = 'stylesheet';
  document.head.appendChild(fontLink);
  
  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    :root {
      --color-almond: #EEE5DA;
      --color-charcoal: #262424;
      --color-lavender: #B8B8CA;
      --color-navy: #1E202C;
      --color-purple: #462F9F;
      
      --text-primary: var(--color-almond);
      --text-secondary: var(--color-lavender);
      --bg-dark: rgba(30, 32, 44, 0.95);
      --bg-glass: rgba(38, 36, 36, 0.1);
      --border-glass: rgba(184, 184, 202, 0.1);
      --accent-gradient: linear-gradient(135deg, var(--color-purple), var(--color-lavender));
    }

    .promen-icon-container {
      cursor: pointer;
      border-radius: 8px;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .promen-icon-container:hover {
      background: var(--color-purple);
      transform: translateY(-1px);
    }
    
    .promen-icon-container .material-icons {
      font-size: 32px;
      color: var(--color-almond);
    }
    
    .promen-popup {
      width: 320px;
      background: #000;
      border: 1px solid var(--border-glass);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
      padding: 16px;
      font-family: 'Ubuntu Mono', monospace;
      color: var(--text-primary);
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.2s ease-out;
    }
    
    .promen-popup.popup-above {
      transform-origin: bottom left;
      transform: translateY(-10px);
    }
    
    .promen-popup.popup-below {
      transform-origin: top left;
      transform: translateY(10px);
    }
    
    .promen-popup.show {
      opacity: 1;
      transform: translateY(0);
    }
    
    .popup-header {
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 1px solid var(--border-glass);
      padding-bottom: 16px;
    }
    
    .header-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .header-title .logo {
      width: 24px;
      height: 24px;
    }
    
    .header-title h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      background: var(--accent-gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .beta-tag {
      background: transparent;
      color: var(--color-lavendar);
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
      font-family: 'Ubuntu Mono', monospace;
      font-style: italic;
      border: 2px solid var(--color-purple);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    
    .text-preview {
      background: var(--bg-glass);
      border: 1px solid var(--border-glass);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 20px;
      max-height: 100px;
      overflow-y: auto;
      font-size: 14px;
      color: var(--text-secondary);
    }
    
    .action-group-title {
      font-size: 14px;
      color: var(--text-secondary);
      margin-bottom: 12px;
    }
    
    .action-row {
      margin-bottom: 8px;
    }
    
    .command-button {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 12px;
      background: var(--bg-glass);
      border: 1px solid var(--border-glass);
      border-radius: 8px;
      color: var(--text-primary);
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: inherit;
      font-size: 14px;
    }
    
    .command-button:hover {
      background: var(--color-purple);
      border-color: var(--color-purple);
      transform: translateX(4px);
    }
    
    .command-button .material-icons {
      color: var(--color-purple);
    }
    
    .command-button:hover .material-icons {
      color: var(--color-almond);
    }
    
    .command-button .shortcut {
      margin-left: auto;
      font-size: 12px;
      color: var(--text-secondary);
      padding: 4px 8px;
      background: var(--bg-glass);
      border-radius: 4px;
    }

    .promen-ghost-buttons {
      position: absolute;
      display: flex;
      gap: 4px;
      justify-content: flex-end;
      padding: 4px;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08);
      animation: buttonsAppear 0.2s ease-out;
      width: 64px; /* Set width to fit two buttons with gap */
    }
  `;
  document.head.appendChild(style);

  // Track focus changes
  document.addEventListener('focusin', (e) => {
    updateIconPosition(e.target);
  });

  // Listen for messages to show or hide the icon
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'show_icon') {
      if (activeElement) {
        updateIconPosition(activeElement);
      }
    } else if (message.action === 'hide_icon') {
      if (currentIcon) {
        currentIcon.remove();
        currentIcon = null;
      }
    }
  });

  debugLog('inject-ui initialization complete.');
}

export { updateIconPosition };
