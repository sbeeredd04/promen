// Debug mode
const DEBUG = false;

// Debug logging helper
function debugLog(message, data) {
  if (DEBUG) {
    console.log(`[Promen Debug] ${message}`, data);
  }
}

// Check if element is a text input
export function isTextInput(element) {
  if (!element) return false;

  debugLog('Checking element for text input:', {
    element,
    tagName: element.tagName,
    type: element.type,
    contentEditable: element.contentEditable,
    role: element.getAttribute('role')
  });

  // Check for standard input types
  if (element.tagName === 'INPUT') {
    const type = element.type?.toLowerCase();
    return ['text', 'search', 'email', 'url', 'tel', 'number'].includes(type);
  }

  // Check for textarea
  if (element.tagName === 'TEXTAREA') {
    return true;
  }

  // Check for contenteditable
  if (element.contentEditable === 'true') {
    return true;
  }

  // Check for common editor roles
  if (element.getAttribute('role') === 'textbox') {
    return true;
  }

  return false;
}

// Get element position with enhanced error handling and debugging
export function getElementPosition(element) {
  if (!element) {
    debugLog('getElementPosition called with null element');
    return null;
  }

  try {
    // Get the actual input area for complex editors
    const inputArea = findActualInputArea(element);
    const rect = inputArea.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(inputArea);
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    
    // Calculate positions accounting for scroll and padding
    const padding = {
      top: parseInt(computedStyle.paddingTop) || 0,
      right: parseInt(computedStyle.paddingRight) || 0,
      bottom: parseInt(computedStyle.paddingBottom) || 0,
      left: parseInt(computedStyle.paddingLeft) || 0
    };

    const pos = {
      top: rect.top + scrollY + padding.top,
      right: rect.right + scrollX - padding.right,
      bottom: rect.bottom + scrollY - padding.bottom,
      left: rect.left + scrollX + padding.left,
      width: rect.width - padding.left - padding.right,
      height: rect.height - padding.top - padding.bottom,
      viewportTop: rect.top,
      viewportLeft: rect.left
    };

    debugLog('Element position calculated:', {
      element: inputArea,
      rect,
      computedStyle,
      padding,
      scroll: { x: scrollX, y: scrollY },
      calculatedPosition: pos
    });

    return pos;
  } catch (error) {
    console.error('[Promen Error] Error getting element position:', error);
    return null;
  }
}

// Helper to find the actual input area in complex editors
function findActualInputArea(element) {
  // For Quill editor
  if (element.classList.contains('ql-container')) {
    return element.querySelector('.ql-editor') || element;
  }

  // For ProseMirror
  if (element.classList.contains('ProseMirror-wrapper')) {
    return element.querySelector('.ProseMirror') || element;
  }

  // For Gemini's rich-textarea
  if (element.tagName.toLowerCase() === 'rich-textarea') {
    return element.querySelector('.ql-editor') || element;
  }

  // For elements with shadow DOM
  if (element.shadowRoot) {
    const shadowInput = element.shadowRoot.querySelector('input, textarea, [contenteditable="true"]');
    if (shadowInput) return shadowInput;
  }

  return element;
}

// Check if element is visible
export function isElementVisible(element) {
  if (!element) return false;

  const rect = element.getBoundingClientRect();
  const computedStyle = window.getComputedStyle(element);

  debugLog('Element visibility check:', {
    element,
    rect,
    computedStyle,
    isVisible: computedStyle.display !== 'none' && 
               computedStyle.visibility !== 'hidden' && 
               rect.width > 0 && 
               rect.height > 0,
    isInViewport: rect.top >= 0 &&
                 rect.left >= 0 &&
                 rect.bottom <= window.innerHeight &&
                 rect.right <= window.innerWidth
  });

  // Basic visibility checks
  if (computedStyle.display === 'none' || 
      computedStyle.visibility === 'hidden' || 
      rect.width === 0 || 
      rect.height === 0) {
    return false;
  }

  // Check if element is in viewport
  return rect.top >= 0 &&
         rect.left >= 0 &&
         rect.bottom <= window.innerHeight &&
         rect.right <= window.innerWidth;
}
