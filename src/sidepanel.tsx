import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

const SidePanel: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')

  const toggleRecording = () => {
    setIsRecording(!isRecording)
    // TODO: Implement audio transcription logic
    if (!isRecording) {
      setTranscript('Recording started... (transcription logic to be implemented)')
    } else {
      setTranscript('Recording stopped.')
    }
  }

  return (
    <div className="p-5 h-screen bg-gray-100">
      <h1 className="text-2xl font-bold mb-5">Live Audio Transcription</h1>
      
      <div className="mb-5">
        <button 
          onClick={toggleRecording}
          className={`px-6 py-3 text-white border-none rounded-md cursor-pointer text-base font-medium transition-colors ${
            isRecording 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-green-500 hover:bg-green-600'
          }`}
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
      </div>

      <div className="bg-white border border-gray-300 rounded-md p-4 min-h-[200px] font-mono">
        <h3 className="text-lg font-semibold mb-2">Transcript:</h3>
        <p className="text-gray-700">{transcript || 'No audio being transcribed...'}</p>
      </div>
    </div>
  )
}

const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(<SidePanel />)
}
