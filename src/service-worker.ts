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

// Configure side panel behavior: open on action click (toolbar icon)
chrome.runtime.onInstalled.addListener(async () => {
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  } catch (e) {
    console.warn('Failed to set side panel behavior on install', e)
  }
})

// Optional: keep side panel enabled for each tab so it persists when navigating
async function enableSidePanelForTab(tabId: number) {
  try {
    await chrome.sidePanel.setOptions({ tabId, enabled: true })
  } catch (error) {
    console.warn('Failed to enable side panel for tab', tabId, error)
  }
}

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await enableSidePanelForTab(activeInfo.tabId)
})

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.status === 'complete') {
    await enableSidePanelForTab(tabId)
  }
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
    
    // TODO: Request audio stream from the active tab or microphone in a UI-initiated context
    // Placeholder: no-op to keep typings happy until implemented
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
