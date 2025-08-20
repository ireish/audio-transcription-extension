// Set the side panel to open when the user clicks the action toolbar icon.
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => {
    console.error('Failed to set side panel behavior:', error);
  });
});

async function createOffscreenDocument() {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [chrome.runtime.getURL('offscreen.html')],
  });

  if (existingContexts.length > 0) {
    return;
  }

  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['AUDIO_PLAYBACK'],
    justification: 'Audio processing for transcription',
  });
}

async function sendToOffscreen(message: any) {
  // A simple retry mechanism can be kept if you find it necessary,
  // but often direct messaging is sufficient.
  try {
    await chrome.runtime.sendMessage(message);
  } catch (error) {
    console.error('Failed to send message to offscreen document:', error);
    throw error;
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    if (message.type === 'OFFSCREEN_START') {
      await createOffscreenDocument();

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab || !tab.id) {
        sendResponse({ ok: false, error: 'No active tab found.' });
        return;
      }
      
      if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('https://chrome.google.com/')) {
        sendResponse({ ok: false, error: 'Cannot record protected browser pages.' });
        return;
      }

      const streamId = await new Promise<string>((resolve) => {
        chrome.tabCapture.getMediaStreamId({ consumerTabId: tab.id }, (id) => {
          // Check for runtime.lastError to handle permission errors
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError.message);
            resolve(''); // Resolve with an empty string to indicate failure
          } else {
            resolve(id);
          }
        });
      });

      if (!streamId) {
        // This will now correctly trigger if activeTab permission wasn't granted
        sendResponse({ ok: false, error: 'Could not capture tab. Please click the extension icon again to activate it for this page.' });
        return;
      }

      await sendToOffscreen({
        target: 'offscreen',
        type: 'START',
        backend: message.backend,
        streamId: streamId,
      });

      sendResponse({ ok: true });
    } else if (message.type === 'OFFSCREEN_STOP') {
      await sendToOffscreen({ target: 'offscreen', type: 'STOP' });
      sendResponse({ ok: true });
    }
  })();
  return true; // Keep message channel open for async response
});