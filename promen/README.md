# Promen - AI Prompt Assistant

Promen is a Chrome extension designed to enhance your productivity and creativity when working with AI tools. It provides a seamless way to interact with text fields across the web, offering AI-powered assistance right at your fingertips.

## Why Promen?

In the near future, the only bridge that will connect humans with AI tools is the prompt. Promen aims to be at the forefront of this transformation by providing a powerful and intuitive interface for crafting and refining prompts. By enhancing the way you interact with AI, Promen empowers you to unlock the full potential of these tools, making your interactions more efficient and effective.

## What is Promen?

Promen is an AI Prompt Assistant that integrates directly into your browser, offering real-time enhancements and suggestions for text inputs. Whether you're drafting an email, writing a blog post, or coding, Promen provides intelligent suggestions to improve clarity, conciseness, and overall quality.

## How Does It Work?

Promen integrates seamlessly into your workflow:

- **Floating Icon**: Automatically detects text fields on web pages and displays a discrete icon. Clicking this icon opens the Promen action popup.
- **Enhance Prompt (Ctrl+Shift+L / Cmd+Shift+L)**: Takes your current prompt and expands upon it, adding detail, context, and specificity to make it more effective for AI models.
- **Rephrase Prompt (Ctrl+Shift+K / Cmd+Shift+K)**: Rewrites your prompt to be clearer, more concise, and precise, improving its overall quality and effectiveness.
- **Agent (Coming Soon - Ctrl+Shift+U / Cmd+Shift+U)**: This feature will allow you to interact with an AI agent directly within the text field. You'll be able to give it instructions or ask questions, and the agent will generate responses or modify the text in place, acting as an intelligent assistant for various tasks.

## Installation

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the `promen` directory

## Usage

1. Navigate to any webpage with text fields
2. Click on a text field to see the Promen icon appear
3. Click the icon to open the popup with available actions
4. Select an action to process the text

## Development

The extension is built with vanilla JavaScript and follows a modular structure:

- `manifest.json`: Core configuration
- `src/content-scripts/`: Contains the logic for detecting text fields and showing the icon
- `src/popup/`: Contains the popup UI and functionality
- `src/background/`: Contains the service worker for background tasks
- `src/utils/`: Contains utility functions
- `styles/`: Contains CSS files for styling

## License

MIT 