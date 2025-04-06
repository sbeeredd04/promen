// Get current text from storage
document.addEventListener('DOMContentLoaded', () => {
  // Initialize UI elements
  const textPreview = document.getElementById('textPreview');
  const promptInput = document.getElementById('promptInput');
  const suggestionsList = document.getElementById('suggestionsList');
  const agentBtn = document.getElementById('agentBtn');
  const agentPanel = document.getElementById('agentPanel');
  const agentQuestion = document.getElementById('agentQuestion');
  const agentOptions = document.getElementById('agentOptions');
  const agentBackBtn = document.getElementById('agentBackBtn');
  const agentNextBtn = document.getElementById('agentNextBtn');
  
  // Agent questions and options
  const agentQuestions = [
    {
      question: "What type of content are you creating?",
      options: ["Code", "Text", "Email", "Documentation", "Social Media", "Other"]
    },
    {
      question: "What is your primary goal?",
      options: ["Explain", "Persuade", "Inform", "Entertain", "Analyze", "Other"]
    },
    {
      question: "Who is your target audience?",
      options: ["Technical", "General", "Professional", "Academic", "Casual", "Other"]
    },
    {
      question: "What tone would you like to use?",
      options: ["Formal", "Casual", "Technical", "Friendly", "Authoritative", "Other"]
    }
  ];
  
  let currentQuestionIndex = 0;
  let selectedOptions = {};
  
  // Load text from storage
  chrome.storage.local.get(['currentText'], (result) => {
    if (result.currentText) {
      // Show preview of the text (truncated if too long)
      textPreview.textContent = result.currentText.length > 150 
        ? result.currentText.substring(0, 150) + '...' 
        : result.currentText;
      
      // Also populate the input field
      promptInput.value = result.currentText;
    } else {
      textPreview.textContent = 'No text selected';
    }
  });
  
  // Autocomplete functionality
  promptInput.addEventListener('input', () => {
    const inputValue = promptInput.value.trim();
    
    if (inputValue.length > 2) {
      // Simulate getting suggestions from an AI service
      const suggestions = getSuggestions(inputValue);
      
      if (suggestions.length > 0) {
        displaySuggestions(suggestions);
      } else {
        suggestionsList.style.display = 'none';
      }
    } else {
      suggestionsList.style.display = 'none';
    }
  });
  
  // Function to get suggestions (simulated)
  function getSuggestions(input) {
    // In a real implementation, this would call an AI service
    const commonPrompts = [
      "Explain the concept of " + input,
      "Write a detailed guide about " + input,
      "Create a step-by-step tutorial for " + input,
      "Analyze the benefits of " + input,
      "Compare and contrast " + input + " with alternatives",
      "Provide examples of " + input + " in real-world applications"
    ];
    
    return commonPrompts.filter(prompt => 
      prompt.toLowerCase().includes(input.toLowerCase())
    );
  }
  
  // Function to display suggestions
  function displaySuggestions(suggestions) {
    suggestionsList.innerHTML = '';
    
    suggestions.forEach(suggestion => {
      const div = document.createElement('div');
      div.className = 'autocomplete-suggestion';
      div.textContent = suggestion;
      
      div.addEventListener('click', () => {
        promptInput.value = suggestion;
        suggestionsList.style.display = 'none';
      });
      
      suggestionsList.appendChild(div);
    });
    
    suggestionsList.style.display = 'block';
  }
  
  // Close suggestions when clicking outside
  document.addEventListener('click', (e) => {
    if (!promptInput.contains(e.target) && !suggestionsList.contains(e.target)) {
      suggestionsList.style.display = 'none';
    }
  });
  
  // Agent panel functionality
  agentBtn.addEventListener('click', () => {
    // Show agent panel
    document.querySelector('.content').style.display = 'none';
    agentPanel.style.display = 'block';
    
    // Reset agent state
    currentQuestionIndex = 0;
    selectedOptions = {};
    
    // Show first question
    showAgentQuestion();
  });
  
  agentBackBtn.addEventListener('click', () => {
    if (currentQuestionIndex > 0) {
      currentQuestionIndex--;
      showAgentQuestion();
    } else {
      // Go back to main content
      agentPanel.style.display = 'none';
      document.querySelector('.content').style.display = 'block';
    }
  });
  
  agentNextBtn.addEventListener('click', () => {
    if (currentQuestionIndex < agentQuestions.length - 1) {
      currentQuestionIndex++;
      showAgentQuestion();
    } else {
      // Generate prompt based on selected options
      generatePrompt();
    }
  });
  
  // Function to show agent question
  function showAgentQuestion() {
    const question = agentQuestions[currentQuestionIndex];
    agentQuestion.textContent = question.question;
    
    // Populate options
    agentOptions.innerHTML = '';
    
    question.options.forEach(option => {
      const div = document.createElement('div');
      div.className = 'agent-option';
      if (selectedOptions[currentQuestionIndex] === option) {
        div.classList.add('selected');
      }
      
      div.textContent = option;
      div.addEventListener('click', () => {
        // Remove selected class from all options
        document.querySelectorAll('.agent-option').forEach(el => {
          el.classList.remove('selected');
        });
        
        // Add selected class to clicked option
        div.classList.add('selected');
        
        // Store selected option
        selectedOptions[currentQuestionIndex] = option;
      });
      
      agentOptions.appendChild(div);
    });
    
    // Update button text for last question
    if (currentQuestionIndex === agentQuestions.length - 1) {
      agentNextBtn.textContent = 'Generate';
    } else {
      agentNextBtn.textContent = 'Next';
    }
  }
  
  // Function to generate prompt based on selected options
  function generatePrompt() {
    // In a real implementation, this would call an AI service
    const contentType = selectedOptions[0] || 'Text';
    const goal = selectedOptions[1] || 'Inform';
    const audience = selectedOptions[2] || 'General';
    const tone = selectedOptions[3] || 'Casual';
    
    const generatedPrompt = `Create ${contentType.toLowerCase()} content that ${goal.toLowerCase()}s a ${audience.toLowerCase()} audience in a ${tone.toLowerCase()} tone.`;
    
    // Set the generated prompt in the input field
    promptInput.value = generatedPrompt;
    
    // Go back to main content
    agentPanel.style.display = 'none';
    document.querySelector('.content').style.display = 'block';
  }
  
  // Add button event listeners for text actions
  document.getElementById('improveBtn').addEventListener('click', () => {
    sendAction('improveText');
  });
  
  document.getElementById('shortenBtn').addEventListener('click', () => {
    sendAction('shortenText');
  });
  
  document.getElementById('expandBtn').addEventListener('click', () => {
    sendAction('expandText');
  });
  
  document.getElementById('grammarBtn').addEventListener('click', () => {
    sendAction('checkGrammar');
  });
  
  // Add button event listeners for code actions
  document.getElementById('formatBtn').addEventListener('click', () => {
    sendAction('formatCode');
  });
  
  document.getElementById('explainBtn').addEventListener('click', () => {
    sendAction('explainCode');
  });
  
  document.getElementById('optimizeBtn').addEventListener('click', () => {
    sendAction('optimizeCode');
  });
  
  document.getElementById('debugBtn').addEventListener('click', () => {
    sendAction('debugCode');
  });
  
  // Function to send action to content script
  function sendAction(action) {
    const text = promptInput.value || textPreview.textContent;
    
    // Send message to content script
    window.parent.postMessage({ 
      action: action, 
      text: text 
    }, '*');
  }
  
  // Header action buttons
  document.getElementById('settingsBtn').addEventListener('click', () => {
    // Open settings (to be implemented)
    console.log('Settings clicked');
  });
  
  document.getElementById('refreshBtn').addEventListener('click', () => {
    // Refresh content (to be implemented)
    console.log('Refresh clicked');
  });
  
  document.getElementById('notificationBtn').addEventListener('click', () => {
    // Show notifications (to be implemented)
    console.log('Notifications clicked');
  });
});
