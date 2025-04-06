// Import utilities
import { isTextInput } from '../utils/dom-helper.js';

// Debug mode
const DEBUG = true;

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
  icon.innerHTML = '<span class="material-icons">edit_note</span>';
  return icon;
}

// Create popup element
function createPopup() {
  const popup = document.createElement('div');
  popup.className = 'promen-popup';
  
  popup.innerHTML = `
    <div class="popup-header">
      <div class="header-title">
        <img src="chrome-extension://${chrome.runtime.id}/icons/icon16.png" alt="Promen" class="logo">
        <h2>AI Prompt Assistant</h2>
      </div>
    </div>
    
    <div class="content">
      <div class="text-preview" id="textPreview"></div>
      
      <div class="action-group">
        <div class="action-group-title">Actions</div>
        <div class="action-row">
          <button class="command-button" data-command="enhance" data-shortcut="Alt+E">
            <span class="material-icons">auto_fix_high</span>
            Enhance
            <span class="shortcut">Alt+E</span>
          </button>
        </div>
        <div class="action-row">
          <button class="command-button" data-command="rephrase" data-shortcut="Alt+R">
            <span class="material-icons">autorenew</span>
            Rephrase
            <span class="shortcut">Alt+R</span>
          </button>
        </div>
        <div class="action-row">
          <button class="command-button" data-command="agent" data-shortcut="Alt+A">
            <span class="material-icons">smart_toy</span>
            Agent
            <span class="shortcut">Alt+A</span>
          </button>
        </div>
      </div>
    </div>
  `;

  return popup;
}

// Handle command execution
async function executeCommand(command) {
  if (!activeElement) return;
  
  const text = activeElement.value || activeElement.textContent || '';
  if (!text) return;

  try {
    const response = await chrome.runtime.sendMessage({
      action: command + '_prompt',
      text: text
    });

    if (response.error) {
      console.error('Command error:', response.error);
      return;
    }

    // Handle the response based on command
    switch (command) {
      case 'enhance':
        if (response.enhanced) {
          if (activeElement.value !== undefined) {
            activeElement.value = response.enhanced;
          } else {
            activeElement.textContent = response.enhanced;
          }
        }
        break;
      case 'rephrase':
        if (response.rephrased) {
          if (activeElement.value !== undefined) {
            activeElement.value = response.rephrased;
          } else {
            activeElement.textContent = response.rephrased;
          }
        }
        break;
    }
  } catch (error) {
    console.error('Failed to execute command:', error);
  }
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
    if (e.altKey) {
      const key = e.key.toUpperCase();
      let command = null;
      
      switch (key) {
        case 'E': command = 'enhance'; break;
        case 'R': command = 'rephrase'; break;
        case 'A': command = 'agent'; break;
      }
      
      if (command) {
        e.preventDefault();
        executeCommand(command);
        popup.remove();
        currentPopup = null;
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
    icon.style.top = '8px';
    icon.style.right = '8px';
    icon.style.zIndex = '999999';
    
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
    .promen-icon-container {
      cursor: pointer;
      padding: 4px;
      border-radius: 6px;
      background: rgba(18, 18, 18, 0.8);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .promen-icon-container:hover {
      background: rgba(255, 255, 255, 0.1);
      transform: translateY(-1px);
    }
    
    .promen-icon-container .material-icons {
      font-size: 20px;
      background: linear-gradient(135deg, #00f2ff, #ff00f2);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    
    .promen-popup {
      width: 320px;
      background: #121212;
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
      padding: 16px;
      font-family: 'Ubuntu Mono', monospace;
      color: white;
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: auto;
      visibility: visible;
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
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 16px;
    }
    
    .header-title {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }
    
    .header-title .logo {
      width: 24px;
      height: 24px;
    }
    
    .header-title h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      background: linear-gradient(135deg, #00f2ff, #ff00f2);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    
    .text-preview {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 20px;
      max-height: 100px;
      overflow-y: auto;
      font-size: 14px;
      color: rgba(255, 255, 255, 0.8);
    }
    
    .action-group-title {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.6);
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
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      color: white;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: inherit;
      font-size: 14px;
    }
    
    .command-button:hover {
      background: rgba(255, 255, 255, 0.1);
      transform: translateX(4px);
      border-color: #00f2ff;
    }
    
    .command-button .material-icons {
      font-size: 20px;
      color: #00f2ff;
    }
    
    .command-button .shortcut {
      margin-left: auto;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
      padding: 4px 8px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
    }
  `;
  document.head.appendChild(style);

  // Track focus changes
  document.addEventListener('focusin', (e) => {
    updateIconPosition(e.target);
  });

  debugLog('inject-ui initialization complete.');
}

export { updateIconPosition };
