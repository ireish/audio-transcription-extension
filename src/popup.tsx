import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

const Popup: React.FC = () => {
  const [apiKey, setApiKey] = useState('')

  const handleSubmit = () => {
    if (apiKey.trim()) {
      // Store the API key in chrome storage
      chrome.storage.sync.set({ geminiApiKey: apiKey }, () => {
        console.log('API key saved')
        // Close the popup
        window.close()
      })
    }
  }

  return (
    <div className="w-[300px] p-4">
      <h2 className="text-lg font-bold mb-4">Enter Gemini API Key</h2>
      <input
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder="Enter your Gemini API key"
        className="w-full p-2 border border-gray-300 rounded-lg mb-6 focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      <button
        onClick={handleSubmit}
        disabled={!apiKey.trim()}
        className="w-full py-2 px-4 bg-blue-400 text-white font-semibold rounded-lg shadow-md hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-opacity-75 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
      >
        Submit
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