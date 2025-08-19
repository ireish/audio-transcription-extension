// Content script that runs on web pages
// This script can interact with the page content and communicate with the extension

console.log('Audio Transcription Extension content script loaded')

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('Content script received message:', message)
  
  switch (message.type) {
    case 'INJECT_TRANSCRIPTION_UI':
      injectTranscriptionUI()
      sendResponse({ success: true })
      break
    
    case 'REMOVE_TRANSCRIPTION_UI':
      removeTranscriptionUI()
      sendResponse({ success: true })
      break
    
    default:
      console.log('Unknown message type in content script:', message.type)
  }
  
  return true
})

// Inject a floating transcription UI on the page
function injectTranscriptionUI() {
  // Check if UI already exists
  if (document.getElementById('audio-transcription-overlay')) {
    return
  }
  
  // Create floating overlay
  const overlay = document.createElement('div')
  overlay.id = 'audio-transcription-overlay'
  overlay.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 300px;
    max-height: 200px;
    background: white;
    border: 2px solid #4CAF50;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    font-family: Arial, sans-serif;
    font-size: 14px;
    overflow-y: auto;
  `
  
  overlay.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
      <strong>Live Transcription</strong>
      <button id="close-transcription" style="background: #f44336; color: white; border: none; border-radius: 3px; padding: 4px 8px; cursor: pointer;">×</button>
    </div>
    <div id="transcription-text" style="min-height: 60px; background: #f9f9f9; padding: 8px; border-radius: 4px;">
      Transcription will appear here...
    </div>
  `
  
  document.body.appendChild(overlay)
  
  // Add close button functionality
  const closeButton = document.getElementById('close-transcription')
  closeButton?.addEventListener('click', removeTranscriptionUI)
}

// Remove the transcription UI
function removeTranscriptionUI() {
  const overlay = document.getElementById('audio-transcription-overlay')
  if (overlay) {
    overlay.remove()
  }
}

// Update transcription text
function updateTranscriptionText(text: string) {
  const transcriptionElement = document.getElementById('transcription-text')
  if (transcriptionElement) {
    transcriptionElement.textContent = text
  }
}

// Listen for transcription updates from the service worker
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'TRANSCRIPTION_UPDATE') {
    updateTranscriptionText(message.text)
  }
})

// Export empty object to make this a module
export {}
