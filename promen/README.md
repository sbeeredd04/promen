# Promen - AI Prompt Assistant

Promen is a Chrome extension designed to enhance your productivity and creativity when working with AI tools. It provides a seamless way to interact with text fields across the web, offering AI-powered assistance right at your fingertips.

## Features

- **Text Field Detection**: Automatically detects text fields on any webpage
- **Floating Icon**: Shows a convenient icon at the top-right corner of text fields
- **Quick Actions**: Provides quick access to common text operations like improving, shortening, and grammar checking

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