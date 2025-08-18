import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

const Popup: React.FC = () => {
  return (
    <div style={{ width: '300px', padding: '16px' }}>
      <h2>Audio Transcription</h2>
      <p>Live audio to text transcriber</p>
      <button 
        onClick={() => {
          // Open side panel
          chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
        }}
        style={{
          padding: '8px 16px',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Open Transcriber
      </button>
    </div>
  )
}

const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(<Popup />)
}
