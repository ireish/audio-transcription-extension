import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/sidepanel.css'
import { formatTime } from './utils/time'
import { checkServerStatus as checkServerStatusApi } from './utils/api'
import RecordingSection from './components/RecordingSection'
import NotificationSection from './components/NotificationSection'
import TranscriptionSection from './components/TranscriptionSection'
import TimerSection from './components/TimerSection'
import type { AppState, TranscriptionLine } from './types'

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
  const transcriptionBoxRef = useRef<HTMLDivElement | null>(null)
  const appStateRef = useRef(appState);
  appStateRef.current = appState;
  const pendingSessionTitleRef = useRef<string | null>(null);
  
  const BACKEND_WS_URL = import.meta.env.VITE_BACKEND_WS_URL || 'ws://localhost:3001/stream';
  const BACKEND_HTTP_URL = import.meta.env.VITE_BACKEND_HTTP_URL || 'http://localhost:3001/upload';
  
  const checkServerStatus = async () => {
    const isOnline = await checkServerStatusApi(BACKEND_HTTP_URL);
    if (isOnline) {
      setServerStatus('online');
    } else {
      setServerStatus('offline');
    }
    return isOnline;
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

        // Optimistically set recording state to fix timestamp race condition
        setAppState(prev => ({ ...prev, isRecording: true, elapsedMs: 0 }));

        const response = await chrome.runtime.sendMessage({
          type: 'OFFSCREEN_START',
          backend: { wsUrl: BACKEND_WS_URL, httpUrl: BACKEND_HTTP_URL }
        });

        if (response && !response.ok) {
          throw new Error(response.error || 'Failed to start recording');
        }

        if (response.title) {
          // Title is received, but the rest of the session state will be updated
          // on 'RECORDING_STARTED' message to ensure sync.
          pendingSessionTitleRef.current = response.title;
        }
      } catch (e: any) {
        console.error('Failed to start transcription', e);
        showMessage(e?.message || 'Failed to start recording');
        // Rollback optimistic state update on failure
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
        <RecordingSection
          isRecording={appState.isRecording}
          serverStatus={serverStatus}
          toggleRecording={toggleRecording}
        />

        <NotificationSection
          serverStatus={serverStatus}
          errorMessage={errorMessage}
          errorType={errorType}
          isRecording={appState.isRecording}
        />

        <TranscriptionSection
          appState={appState}
          interimText={interimText}
          transcriptionBoxRef={transcriptionBoxRef}
          lineStartTimeRef={lineStartTimeRef}
          copyToClipboard={copyToClipboard}
          downloadText={downloadText}
          downloadJson={downloadJson}
        />

        <TimerSection
          elapsedMs={appState.elapsedMs}
          formatTime={formatTime}
          clearAll={clearAll}
        />
      </div>
    </div>
  )
}

const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(<SidePanel />)
}
