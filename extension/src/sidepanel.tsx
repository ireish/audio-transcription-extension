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

interface AppState {
  sessions: TranscriptionSession[];
  isRecording: boolean;
  activeSessionIndex: number | null;
  currentText: string;
  elapsedMs: number;
}

const SidePanel: React.FC = () => {
  const [appState, setAppState] = useState<AppState>({
    sessions: [],
    isRecording: false,
    activeSessionIndex: null,
    currentText: '',
    elapsedMs: 0,
  });
  const [interimText, setInterimText] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [errorType, setErrorType] = useState<'success' | 'error'>('error')
  const [isStateLoaded, setIsStateLoaded] = useState(false)
  const [serverStatus, setServerStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  
  const timerRef = useRef<number | null>(null)
  const lineStartTimeRef = useRef<string | null>(null)
  const transcriptionBoxRef = useRef<HTMLDivElement>(null)
  const appStateRef = useRef(appState);
  appStateRef.current = appState;
  const pendingSessionTitleRef = useRef<string | null>(null);
  
  const BACKEND_WS_URL = 'ws://localhost:3001/stream'
  const BACKEND_HTTP_URL = 'http://localhost:3001/upload'
  
  const checkServerStatus = async () => {
    try {
      const response = await fetch(`${BACKEND_HTTP_URL.replace('/upload', '')}/health`);
      if (response.ok) {
        setServerStatus('online');
        return true;
      } else {
        setServerStatus('offline');
        return false;
      }
    } catch (error) {
      setServerStatus('offline');
      return false;
    }
  };
  
  // Check server status periodically
  useEffect(() => {
    checkServerStatus(); // Initial check
    const intervalId = setInterval(checkServerStatus, 5000); // Check every 5 seconds
    return () => clearInterval(intervalId); // Cleanup on unmount
  }, []);

  // Load state from storage on component mount
  useEffect(() => {
    chrome.storage.local.get('appState', (result) => {
      if (result.appState) {
        setAppState(result.appState)
      }
      setIsStateLoaded(true)
    })
  }, [])

  // Save state to storage whenever it changes
  useEffect(() => {
    if (isStateLoaded) {
      chrome.storage.local.set({ appState })
    }
  }, [appState, isStateLoaded])

  // Listen for changes from other tabs/windows to keep state in sync
  useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local' && changes.appState) {
        if (JSON.stringify(changes.appState.newValue) !== JSON.stringify(appStateRef.current)) {
          setAppState(changes.appState.newValue);
        }
      }
    };
    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  // Message listener for transcription updates
  useEffect(() => {
    const messageListener = (message: any) => {
      if (message.type === 'TRANSCRIPTION_UPDATE') {
        const { transcript, isFinal } = message.data
        if (isFinal) {
          setAppState(prev => {
            // Guard against updates before session is officially started
            if (prev.activeSessionIndex === null) return prev;

            const textToProcess = prev.currentText + transcript + ' '
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

            let newSessions = prev.sessions;
            if (newLines.length > 0 && prev.activeSessionIndex !== null && prev.activeSessionIndex < prev.sessions.length) {
              newSessions = [...prev.sessions];
              const sessionToUpdate = { ...newSessions[prev.activeSessionIndex] };
              sessionToUpdate.lines = [...sessionToUpdate.lines, ...newLines];
              newSessions[prev.activeSessionIndex] = sessionToUpdate;
            }

            return { ...prev, sessions: newSessions, currentText: words.join(' ') + ' ' };
          })
          setInterimText('')
        } else {
          setInterimText(transcript)
        }
      } else if (message.type === 'OFFSCREEN_FAILURE') {
        showMessage(message.error || 'An unknown error occurred during recording.');
        setAppState(prev => ({ ...prev, isRecording: false, activeSessionIndex: null }));
      } else if (message.type === 'CONNECTION_LOST') {
        showMessage(message.error || 'Connection to the server was lost.');
        setAppState(prev => ({ ...prev, isRecording: false, activeSessionIndex: null, elapsedMs: 0 }));
        setServerStatus('offline');
      } else if (message.type === 'RECORDING_STARTED') {
        setAppState(prev => {
          if (!pendingSessionTitleRef.current) return prev; // Should not happen

          const newSession = { title: pendingSessionTitleRef.current, lines: [] };
          pendingSessionTitleRef.current = null;
          
          const { currentText, activeSessionIndex, sessions } = prev;
          let newSessions = sessions;

          // Flush text from a PREVIOUS session before starting a new one.
          if (currentText.trim() && activeSessionIndex !== null && activeSessionIndex < sessions.length) {
            newSessions = [...sessions];
            const sessionToUpdate = { ...newSessions[activeSessionIndex] };
            sessionToUpdate.lines = [...sessionToUpdate.lines, { text: currentText.trim(), timestamp: lineStartTimeRef.current! }];
            newSessions[activeSessionIndex] = sessionToUpdate;
          }

          const sessionsWithNew = [...newSessions, newSession];

          return {
            ...prev,
            sessions: sessionsWithNew,
            isRecording: true,
            activeSessionIndex: sessionsWithNew.length - 1,
            currentText: '',
          };
        });
      }
    }
    chrome.runtime.onMessage.addListener(messageListener)
    return () => chrome.runtime.onMessage.removeListener(messageListener)
  }, [])

  // Start/Stop timer based on recording state
  useEffect(() => {
    if (appState.isRecording) {
      const startTime = Date.now() - appState.elapsedMs;
      timerRef.current = window.setInterval(() => {
        setAppState(prev => ({ ...prev, elapsedMs: Date.now() - startTime }));
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [appState.isRecording]);

  // Effect for auto-scrolling the transcription box
  useEffect(() => {
    if (transcriptionBoxRef.current) {
      transcriptionBoxRef.current.scrollTop = transcriptionBoxRef.current.scrollHeight
    }
  }, [appState.sessions, appState.currentText, interimText])

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

  const toggleRecording = async () => {
    if (appState.isRecording) {
      // STOP RECORDING
      try {
        chrome.runtime.sendMessage({ target: 'offscreen', type: 'STOP' });
      } catch {}

      setAppState(prev => {
        const { currentText, activeSessionIndex, sessions } = prev;
        let newSessions = sessions;

        // Flush any remaining text to the active session
        if (currentText.trim() && activeSessionIndex !== null && activeSessionIndex < sessions.length) {
          newSessions = [...sessions];
          const sessionToUpdate = { ...newSessions[activeSessionIndex] };
          sessionToUpdate.lines = [...sessionToUpdate.lines, { text: currentText.trim(), timestamp: lineStartTimeRef.current! }];
          newSessions[activeSessionIndex] = sessionToUpdate;
        }
        
        return {
          ...prev,
          sessions: newSessions,
          isRecording: false,
          activeSessionIndex: null,
          currentText: '',
          elapsedMs: 0,
        };
      });
    } else {
      // START RECORDING
      const isServerOnline = await checkServerStatus();
      if (!isServerOnline) {
        showMessage('Cannot start recording. Backend server is offline.');
        return;
      }
      
      try {
        setErrorMessage(null);
        setInterimText('');
        lineStartTimeRef.current = new Date().toISOString();

        const response = await chrome.runtime.sendMessage({
          type: 'OFFSCREEN_START',
          backend: { wsUrl: BACKEND_WS_URL, httpUrl: BACKEND_HTTP_URL }
        });

        if (response && !response.ok) {
          throw new Error(response.error || 'Failed to start recording');
        }

        if (response.title) {
          // Don't update state yet. Wait for confirmation.
          pendingSessionTitleRef.current = response.title;
        }
      } catch (e: any) {
        console.error('Failed to start transcription', e);
        showMessage(e?.message || 'Failed to start recording');
        setAppState(prev => ({ ...prev, isRecording: false }));
      }
    }
  };

  const generateTranscriptionText = (includeTimestamps = true) => {
    let fullText = appState.sessions.map(session => {
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

    if (appState.currentText.trim()) {
      const time = `[${new Date(lineStartTimeRef.current!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}]`
      const currentLine = includeTimestamps ? `${time} ${appState.currentText.trim()}` : appState.currentText.trim()
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
      duration: formatTime(appState.elapsedMs),
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
    try {
      chrome.runtime.sendMessage({ target: 'offscreen', type: 'STOP' });
    } catch {}
    setAppState({
      sessions: [],
      isRecording: false,
      activeSessionIndex: null,
      currentText: '',
      elapsedMs: 0,
    });
    setInterimText('');
  }

  return (
    <div>
      <div className="container">
        {/* Recording (10%) */}
        <div className="recording-section">
          <button
            onClick={toggleRecording}
            className={`record-button ${appState.isRecording ? 'recording' : ''}`}
            disabled={serverStatus !== 'online'}
          >
            {appState.isRecording ? 'Stop Recording' : 'Start Recording'}
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
          <h4 className="status-header">Status</h4>
          {serverStatus === 'offline' ? (
            <div className="status-message error">Server is offline. Please start the backend server.</div>
          ) : errorMessage ? (
            <div className={`status-message ${errorType === 'success' ? 'success' : 'error'}`}>
              {errorMessage}
            </div>
          ) : serverStatus === 'online' && !appState.isRecording ? (
            <div className="status-message success">Server is online. Ready to record.</div>
          ) : null}
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
            {appState.isRecording && appState.sessions.length === 0 && appState.currentText.length === 0 && interimText.length === 0 ? (
              <div style={{ color: '#667eea', fontStyle: 'italic' }}>🔴 Recording... Listening for audio input...</div>
            ) : (
              <>
                {appState.sessions.map((session, sessionIndex) => (
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
                {(appState.currentText || interimText) && (
                  <div className="transcription-line">
                    {appState.isRecording && (
                      <span className="timestamp">
                        [{new Date(lineStartTimeRef.current || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}]
                      </span>
                    )}
                    <span>{appState.currentText}</span>
                    {interimText && <span className="interim-text">{interimText}</span>}
                  </div>
                )}
                {appState.sessions.length === 0 && appState.currentText.length === 0 && interimText.length === 0 && (
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
          <div className="timer" id="timer">{formatTime(appState.elapsedMs)}</div>
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
