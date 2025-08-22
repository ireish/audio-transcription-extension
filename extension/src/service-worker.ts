// service-worker.ts

// This listener opens the side panel for the specific tab where the icon is clicked.
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});

let pendingOffscreenMessage: any = null;

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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    // Handles the "I'm ready" message from the offscreen document
    if (message.type === 'OFFSCREEN_READY') {
      if (pendingOffscreenMessage) {
        await chrome.runtime.sendMessage(pendingOffscreenMessage);
        pendingOffscreenMessage = null;
      }
      sendResponse(true);
      return;
    }

    if (message.type === 'OFFSCREEN_START') {
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
        // We must specify the tab we want to capture, but consumerTabId is not
        // necessary. If not specified, the stream can be consumed in any tab
        // of the same extension, which is what we want for the offscreen doc.
        chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id }, (id) => {
          resolve(chrome.runtime.lastError ? '' : id);
        });
      });

      if (!streamId) {
        sendResponse({ ok: false, error: 'Could not capture tab. Please click the icon again to activate for this page.' });
        return;
      }

      // Store the command and create the document. The command will be sent
      // once the document confirms it's ready.
      pendingOffscreenMessage = {
        target: 'offscreen',
        type: 'START',
        backend: message.backend,
        streamId: streamId,
      };

      await createOffscreenDocument();
      sendResponse({ ok: true, title: tab.title });
    }
  })();
  return true; // Keep message channel open for async response
});