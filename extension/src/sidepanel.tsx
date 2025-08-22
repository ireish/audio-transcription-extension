import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/sidepanel.css'

interface TranscriptionLine {
  text: string
  timestamp: string
}

interface TranscriptionSession {
  title: string
  lines: TranscriptionLine[]
}

const SidePanel: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false)
  const [sessions, setSessions] = useState<TranscriptionSession[]>([])
  const [currentText, setCurrentText] = useState('')
  const [interimText, setInterimText] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [errorType, setErrorType] = useState<'success' | 'error'>('error')
  const [elapsedMs, setElapsedMs] = useState(0)
  const startTimeRef = useRef<number | null>(null)
  const timerRef = useRef<number | null>(null)
  const lineStartTimeRef = useRef<string | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const transcriptionBoxRef = useRef<HTMLDivElement>(null)
  const BACKEND_WS_URL = 'ws://localhost:3001/stream'
  const BACKEND_HTTP_URL = 'http://localhost:3001/upload'

  useEffect(() => {
    const messageListener = (message: any) => {
      if (message.type === 'TRANSCRIPTION_UPDATE') {
        const { transcript, isFinal } = message.data
        if (isFinal) {
          setCurrentText(prev => {
            const textToProcess = prev + transcript + ' '
            const words = textToProcess.split(/\s+/).filter(Boolean)
            
            const newLines: TranscriptionLine[] = []
            while (words.length >= 40) {
              const lineWords = words.splice(0, 40)
              newLines.push({
                text: lineWords.join(' '),
                timestamp: lineStartTimeRef.current!
              })
              lineStartTimeRef.current = new Date().toISOString()
            }
            if (newLines.length > 0) {
              setSessions(prevSessions => {
                if (prevSessions.length === 0) return prevSessions
                const lastSession = prevSessions[prevSessions.length - 1]
                const updatedLines = [...lastSession.lines, ...newLines]
                const updatedSession = { ...lastSession, lines: updatedLines }
                return [...prevSessions.slice(0, -1), updatedSession]
              })
            }
            return words.join(' ') + ' '
          })
          setInterimText('')
        } else {
          setInterimText(transcript)
        }
      }
    }

    chrome.runtime.onMessage.addListener(messageListener)

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener)
      if (timerRef.current) {
        window.clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (transcriptionBoxRef.current) {
      transcriptionBoxRef.current.scrollTop = transcriptionBoxRef.current.scrollHeight
    }
  }, [sessions, currentText, interimText])

  const showMessage = (message: string, type: 'success' | 'error' = 'error') => {
    setErrorType(type)
    setErrorMessage(message)
    window.setTimeout(() => setErrorMessage(null), 3000)
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
    if (currentText.trim()) {
      setSessions(prev => {
        if (prev.length === 0) return prev
        const lastSession = prev[prev.length - 1]
        const updatedLines = [...lastSession.lines, { text: currentText.trim(), timestamp: lineStartTimeRef.current! }]
        const updatedSession = { ...lastSession, lines: updatedLines }
        return [...prev.slice(0, -1), updatedSession]
      })
      setCurrentText('')
    }
  }

  // If needed in future: function to reset the timer

  // No longer needed here: WS/MediaRecorder handled by offscreen document

  const startTranscription = async () => {
    try {
      setErrorMessage(null)
      setCurrentText('')
      setInterimText('')
      lineStartTimeRef.current = new Date().toISOString()

      // Ask service worker to ensure offscreen and start
      const response = await chrome.runtime.sendMessage({
        type: 'OFFSCREEN_START',
        backend: { wsUrl: BACKEND_WS_URL, httpUrl: BACKEND_HTTP_URL }
      });

      if (response && !response.ok) {
        throw new Error(response.error || 'Failed to start recording')
      }
      if (response.title) {
        setSessions(prev => [...prev, { title: response.title, lines: [] }])
      }
    } catch (e: any) {
      console.error('Failed to start transcription', e)
      showMessage(e?.message || 'Failed to start recording')
      try { mediaStreamRef.current?.getTracks().forEach(t => t.stop()) } catch {}
    }
  }

  const stopTranscription = () => {
    try {
      chrome.runtime.sendMessage({ target: 'offscreen', type: 'STOP' });
    } catch {}
  }

  const toggleRecording = () => {
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

  const generateTranscriptionText = (includeTimestamps = true) => {
    let fullText = sessions.map(session => {
      const sessionTitle = `\n--- ${session.title} ---\n`;
      const sessionLines = session.lines
        .map(line => {
          if (line.text) {
            const time = `[${new Date(line.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}]`
            return includeTimestamps ? `${time} ${line.text}` : line.text
          }
          return ''
        })
        .join('\n')
      return sessionTitle + sessionLines
    }).join('\n')

    if (currentText.trim()) {
      const time = `[${new Date(lineStartTimeRef.current!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}]`
      const currentLine = includeTimestamps ? `${time} ${currentText.trim()}` : currentText.trim()
      fullText += `\n${currentLine}`
    }
    return fullText.trim()
  }

  const copyToClipboard = async () => {
    const textToCopy = generateTranscriptionText()
    if (!textToCopy) {
      showMessage('No transcription text to copy')
      return
    }
    try {
      await navigator.clipboard.writeText(textToCopy)
      showMessage('Text copied to clipboard!', 'success')
    } catch {
      showMessage('Failed to copy text')
    }
  }

  const downloadText = () => {
    const textToDownload = generateTranscriptionText()
    if (!textToDownload) {
      showMessage('No transcription text to download')
      return
    }
    const blob = new Blob([textToDownload], { type: 'text/plain' })
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
    const textToDownload = generateTranscriptionText()
    if (!textToDownload) {
      showMessage('No transcription text to download')
      return
    }
    const data = {
      transcription: textToDownload,
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

  const clearAll = () => {
    setSessions([])
    setCurrentText('')
    setInterimText('')
    if (!isRecording) {
      setElapsedMs(0)
    }
  }

  return (
    <div>
      <div className="container">
        {/* Recording (10%) */}
        <div className="recording-section">
          <button
            onClick={toggleRecording}
            className={`record-button ${isRecording ? 'recording' : ''}`}
          >
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </button>
          <label className="mic-checkbox">
            <input
              type="checkbox"
              checked={false}
              onChange={() => {}}
              disabled
            />
            <span>Microphone</span>
          </label>
        </div>

        {/* Notification Status (7%) */}
        <div className="notification-section">
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

        {/* Transcription (73%) */}
        <div className="transcription-section">
          <div className="transcription-header">
            <h3 className="transcription-title">Transcription</h3>
            <div className="action-buttons">
              <button className="action-btn" onClick={copyToClipboard}>📋 Copy</button>
              <button className="action-btn" onClick={downloadText}>💾 TXT</button>
              <button className="action-btn" onClick={downloadJson}>📄 JSON</button>
            </div>
          </div>
          <div className="transcription-box" id="transcriptionBox" ref={transcriptionBoxRef}>
            {isRecording && sessions.length === 0 && currentText.length === 0 && interimText.length === 0 ? (
              <div style={{ color: '#667eea', fontStyle: 'italic' }}>🔴 Recording... Listening for audio input...</div>
            ) : (
              <>
                {sessions.map((session, sessionIndex) => (
                  <div key={sessionIndex}>
                    <div className="session-title">{session.title}</div>
                    {session.lines.map((line, lineIndex) => (
                      <div key={lineIndex} className="transcription-line">
                        <span className="timestamp">
                          [{new Date(line.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}]
                        </span>
                        {line.text}
                      </div>
                    ))}
                  </div>
                ))}
                <div className="transcription-line">
                  {isRecording && sessions.length > 0 && <span className="timestamp">
                    [{new Date(lineStartTimeRef.current!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}]
                  </span>}
                  <span>{currentText}</span>
                  {interimText && <span className="interim-text">{interimText}</span>}
                </div>
                {sessions.length === 0 && currentText.length === 0 && interimText.length === 0 && (
                  <div className="transcription-placeholder">
                    Click the record button to start transcribing audio...
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Timer (10%) */}
        <div className="timer-section">
          <span className="timer-title">Session time: </span>
          <div className="timer" id="timer">{formatTime(elapsedMs)}</div>
          <button className="action-btn" onClick={clearAll} style={{ marginLeft: '10px' }}>Clear Transcripts</button>
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
