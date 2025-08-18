// Background service worker for Chrome extension
// This handles background tasks and extension lifecycle events

// Extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Audio Transcription Extension installed:', details)
  
  // Set up default settings
  chrome.storage.sync.set({
    transcriptionEnabled: false,
    language: 'en-US'
  })
})

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('Audio Transcription Extension started')
})

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('Message received in service worker:', message)
  
  switch (message.type) {
    case 'START_TRANSCRIPTION':
      handleStartTranscription(message.data)
      sendResponse({ success: true })
      break
    
    case 'STOP_TRANSCRIPTION':
      handleStopTranscription()
      sendResponse({ success: true })
      break
    
    default:
      console.log('Unknown message type:', message.type)
  }
  
  return true // Keep message channel open for async response
})

// Handle tab capture for audio transcription
async function handleStartTranscription(data: any) {
  try {
    // TODO: Implement audio capture and transcription logic
    console.log('Starting transcription with data:', data)
    
    // Request tab capture permissions if needed
    const stream = await chrome.tabCapture.getMediaStreamId({
      consumerTabId: chrome.tabs.getCurrent().then(tab => tab?.id ?? 0)
    })
    
    console.log('Tab capture started with stream:', stream)
  } catch (error) {
    console.error('Error starting transcription:', error)
  }
}

function handleStopTranscription() {
  try {
    // TODO: Implement stop transcription logic
    console.log('Stopping transcription')
  } catch (error) {
    console.error('Error stopping transcription:', error)
  }
}

// Export empty object to make this a module
export {}
