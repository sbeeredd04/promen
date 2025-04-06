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

function createIcon() {
  const icon = document.createElement('div');
  icon.className = 'promen-icon-container';
  icon.innerHTML = '<span class="material-icons">edit_note</span>';
  return icon;
}

function showPopup(iconElement) {
  if (currentPopup) {
    currentPopup.remove();
  }

  const popup = document.createElement('div');
  popup.className = 'promen-popup';
  
  popup.innerHTML = `
    <div class="popup-header">
      <div class="header-title">
        <span class="material-icons">auto_fix_high</span>
        <h1>Promen</h1>
      </div>
      <div class="header-subtitle">AI Prompt Assistant</div>
    </div>
    <div class="popup-content">
      <div class="command-list">
        <button class="command-button" data-command="enhance">
          <span class="material-icons">auto_fix_high</span>
          Enhance
          <span class="shortcut">Alt+E</span>
        </button>
        <button class="command-button" data-command="rephrase">
          <span class="material-icons">autorenew</span>
          Rephrase
          <span class="shortcut">Alt+R</span>
        </button>
        <button class="command-button" data-command="agent">
          <span class="material-icons">smart_toy</span>
          Agent
          <span class="shortcut">Alt+A</span>
        </button>
      </div>
    </div>
  `;

  // Position popup above the icon
  const rect = iconElement.getBoundingClientRect();
  popup.style.position = 'fixed';
  popup.style.zIndex = '999999';
  popup.style.bottom = `${window.innerHeight - rect.top + 8}px`;
  popup.style.left = `${rect.left}px`;
  
  document.body.appendChild(popup);
  currentPopup = popup;
  
  // Add click handlers for commands
  popup.querySelectorAll('.command-button').forEach(button => {
    button.addEventListener('click', () => {
      const command = button.dataset.command;
      const text = activeElement.value || activeElement.textContent || '';
      
      chrome.runtime.sendMessage({ 
        action: command + '_prompt', 
        text: text 
      });
      
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
}

function updateIconPosition(element) {
  if (!element || !isTextInput(element)) return;
  
  // Only create icon if it doesn't exist or element changed
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

export function initialize() {
  debugLog('Initializing inject-ui script...');
  
  // Add Material Icons
  const link = document.createElement('link');
  link.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
  link.rel = 'stylesheet';
  document.head.appendChild(link);
  
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
      background: rgba(18, 18, 18, 0.95);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
      padding: 16px;
      font-family: 'Ubuntu Mono', monospace;
      color: white;
    }
    
    .popup-header {
      text-align: center;
      margin-bottom: 20px;
    }
    
    .header-title {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 8px;
    }
    
    .header-title h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      background: linear-gradient(135deg, #00f2ff, #ff00f2);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    
    .header-subtitle {
      color: rgba(255, 255, 255, 0.7);
      font-size: 14px;
    }
    
    .command-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .command-button {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 12px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
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
