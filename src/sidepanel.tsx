import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './sidepanel.css'

const SidePanel: React.FC = () => {
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isMicEnabled, setIsMicEnabled] = useState(true)
  const [transcriptionText, setTranscriptionText] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [errorType, setErrorType] = useState<'success' | 'error'>('error')
  const [elapsedMs, setElapsedMs] = useState(0)
  const startTimeRef = useRef<number | null>(null)
  const timerRef = useRef<number | null>(null)

  // Load stored API key on mount
  useEffect(() => {
    chrome.storage?.sync.get(['apiKey']).then((res) => {
      const stored = res?.apiKey as string | undefined
      if (stored && stored.length > 0) {
        setIsConnected(true)
      }
    }).catch(() => {})
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [])

  const showMessage = (message: string, type: 'success' | 'error' = 'error') => {
    setErrorType(type)
    setErrorMessage(message)
    window.setTimeout(() => setErrorMessage(null), 3000)
  }

  const saveApiKey = async () => {
    const value = apiKeyInput.trim()
    if (!value) {
      showMessage('Please enter a valid API key')
      return
    }
    try {
      await chrome.storage?.sync.set({ apiKey: value })
      setIsConnected(true)
      setApiKeyInput('')
      showMessage('API Key saved successfully!', 'success')
    } catch {
      showMessage('Failed to save API key')
    }
  }

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  }

  const startTimer = () => {
    startTimeRef.current = Date.now()
    timerRef.current = window.setInterval(() => {
      if (startTimeRef.current) {
        setElapsedMs(Date.now() - startTimeRef.current)
      }
    }, 1000)
  }

  const stopTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  // If needed in future: function to reset the timer

  const startTranscription = () => {
    // Placeholder: simulate a live message line when recording starts
    setTranscriptionText('')
  }

  const stopTranscription = () => {
    // Placeholder for stopping transcription
  }

  const toggleRecording = () => {
    if (!isConnected) {
      showMessage('Please enter your API Key first')
      return
    }
    if (!isMicEnabled) {
      showMessage('Please enable microphone access')
      return
    }
    const next = !isRecording
    setIsRecording(next)
    if (next) {
      startTimer()
      startTranscription()
    } else {
      stopTimer()
      stopTranscription()
    }
  }

  const copyToClipboard = async () => {
    if (!transcriptionText.trim()) {
      showMessage('No transcription text to copy')
      return
    }
    try {
      await navigator.clipboard.writeText(transcriptionText)
      showMessage('Text copied to clipboard!', 'success')
    } catch {
      showMessage('Failed to copy text')
    }
  }

  const downloadText = () => {
    if (!transcriptionText.trim()) {
      showMessage('No transcription text to download')
      return
    }
    const blob = new Blob([transcriptionText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transcription_${new Date().toISOString().slice(0, 10)}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const downloadJson = () => {
    if (!transcriptionText.trim()) {
      showMessage('No transcription text to download')
      return
    }
    const data = {
      transcription: transcriptionText,
      timestamp: new Date().toISOString(),
      duration: formatTime(elapsedMs),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transcription_${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="container">
        {/* API Key + Status (15%) */}
        <div className="api-section">
          <div className="api-input-row">
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveApiKey() }}
              placeholder="Enter Gemini API Key"
              className="api-input"
            />
            <button onClick={saveApiKey} className="api-submit">Save</button>
          </div>
          <div className="connection-status">
            <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`} />
            <span>{isConnected ? 'Connected to Gemini API' : 'Disconnected'}</span>
          </div>
        </div>

        {/* Recording (20%) */}
        <div className="recording-section">
          <button
            onClick={toggleRecording}
            className={`record-button ${isRecording ? 'recording' : ''}`}
          >
            {isRecording ? '⏹️' : '🎤'}
          </button>
          <label className="mic-checkbox">
            <input
              type="checkbox"
              checked={isMicEnabled}
              onChange={(e) => setIsMicEnabled(e.target.checked)}
            />
            <span>Microphone</span>
          </label>
        </div>

        {/* Transcription (55%) */}
        <div className="transcription-section">
          <div className="transcription-header">
            <h3 className="transcription-title">Transcription</h3>
            <div className="action-buttons">
              <button className="action-btn" onClick={copyToClipboard}>📋 Copy</button>
              <button className="action-btn" onClick={downloadText}>💾 TXT</button>
              <button className="action-btn" onClick={downloadJson}>📄 JSON</button>
            </div>
          </div>
          <div className="transcription-box" id="transcriptionBox">
            {isRecording && transcriptionText.length === 0 ? (
              <div style={{ color: '#667eea', fontStyle: 'italic' }}>🔴 Recording... Listening for audio input...</div>
            ) : (
              <div className={transcriptionText ? '' : 'transcription-placeholder'}>
                {transcriptionText || 'Click the record button to start transcribing audio...'}
              </div>
            )}
          </div>
        </div>

        {/* Timer (10%) */}
        <div className="timer-section">
          <div className="timer" id="timer">{formatTime(elapsedMs)}</div>
          {errorMessage && (
            <div className={`error-notification show`} style={{
              background: errorType === 'success' ? '#e6ffe6' : '#ffe6e6',
              borderColor: errorType === 'success' ? '#b3ffb3' : '#ffb3b3',
              color: errorType === 'success' ? '#006600' : '#cc0000'
            }}>
              {errorMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(<SidePanel />)
}
