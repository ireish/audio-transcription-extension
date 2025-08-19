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

// Create offscreen document for audio processing when needed
async function createOffscreenDocument() {
  // Check if offscreen document already exists
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [chrome.runtime.getURL('offscreen.html')]
  })

  if (existingContexts.length > 0) {
    return // Already exists
  }

  // Create the offscreen document
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['AUDIO_PLAYBACK'],
    justification: 'Audio processing for transcription'
  })
}

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('Audio Transcription Extension started')
  // Ensure offscreen document exists (idempotent)
  createOffscreenDocument().catch((e) => console.warn('Offscreen init skipped/failed:', e))
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

// Export empty object to make this a module
export {}
