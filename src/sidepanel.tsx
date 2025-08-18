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
    <div style={{ padding: '20px', height: '100vh', backgroundColor: '#f5f5f5' }}>
      <h1>Live Audio Transcription</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={toggleRecording}
          style={{
            padding: '12px 24px',
            backgroundColor: isRecording ? '#f44336' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
      </div>

      <div style={{
        backgroundColor: 'white',
        border: '1px solid #ddd',
        borderRadius: '6px',
        padding: '16px',
        minHeight: '200px',
        fontFamily: 'monospace'
      }}>
        <h3>Transcript:</h3>
        <p>{transcript || 'No audio being transcribed...'}</p>
      </div>
    </div>
  )
}

const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(<SidePanel />)
}
