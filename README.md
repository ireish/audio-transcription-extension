# Live Audio to Text Transcriber [In Progress . . .]

A Chrome browser extension that provides real-time audio transcription using Google's Gemini API. This extension captures audio from your microphone or browser tabs and converts speech to text in real-time through a convenient side panel interface.

## Features

- 🎤 **Real-time Audio Transcription**: Live conversion of speech to text
- 🔒 **Secure API Integration**: Uses Google Gemini API for accurate transcription
- 📱 **Side Panel Interface**: Clean, modern UI accessible from any webpage
- 🎛️ **Audio Controls**: Toggle microphone access and recording states
- 📋 **Copy & Export**: Copy transcriptions to clipboard or download as TXT/JSON
- ⏱️ **Recording Timer**: Track session duration
- 💾 **Local Storage**: Securely store API keys locally

## Installation

### From Source

1. Clone this repository:
   ```bash
   git clone <your-repo-url>
   cd audio-transcription-extension
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Load in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the `dist` folder

## Setup

1. **Get a Gemini API Key**:
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key for Gemini
   - Copy the generated key

2. **Configure the Extension**:
   - Click the extension icon in Chrome
   - Enter your Gemini API key in the side panel
   - Click "Save" to store the key securely

## Usage

1. **Open the Side Panel**: Click the extension icon in your browser toolbar
2. **Configure Audio**: Ensure microphone access is enabled
3. **Start Recording**: Click the microphone button to begin transcription
4. **View Results**: Transcribed text appears in real-time in the panel
5. **Export Data**: Use the copy, TXT, or JSON buttons to save your transcription

## Development

### Prerequisites

- Node.js 16+ 
- npm or yarn
- Chrome browser

### Tech Stack

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite with CRXJS plugin
- **Extension API**: Chrome Extension Manifest V3
- **Linting**: ESLint with TypeScript support

### Available Scripts

```bash
# Development with hot reload
npm run dev

# Build for production
npm run build

# Build and watch for changes
npm run build:watch

# Lint code
npm run lint

# Preview production build
npm run preview
```

### Project Structure

```
src/
├── manifest.json          # Extension manifest (Manifest V3)
├── content.ts             # Content script
├── service-worker.ts      # Background service worker
├── sidepanel.tsx          # Main UI component
├── sidepanel.css          # Styles for side panel
└── assets/                # Static assets
```

## Permissions

This extension requires the following permissions:

- `activeTab`: Access to current tab for audio capture
- `storage`: Store API keys and settings
- `sidePanel`: Display the transcription interface
- `tabCapture`: Capture audio from browser tabs
- `audioCapture`: Access microphone audio
- `microphone`: Microphone access permission

## Privacy & Security

- API keys are stored locally in Chrome's secure storage
- Audio data is processed through Google's Gemini API
- No audio data is stored locally or transmitted elsewhere
- Extension follows Chrome Web Store privacy policies

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter issues or have questions:

1. Check the [Issues](../../issues) page for existing solutions
2. Create a new issue with detailed information about the problem
3. Include Chrome version, extension version, and steps to reproduce

## Changelog

### Version 0.0.1
- Initial release
- Basic audio transcription functionality
- Side panel interface
- Gemini API integration
