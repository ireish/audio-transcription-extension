import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

const Popup: React.FC = () => {
  return (
    <div className="w-[300px] p-4">
      <h2 className="text-lg font-bold">Audio Transcription</h2>
      <p className="text-sm text-gray-600 mb-4">Live audio to text transcriber</p>
      <button
        onClick={() => {
          // Open side panel
          chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
        }}
        className="w-full py-2 px-4 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75"
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

export default Popup