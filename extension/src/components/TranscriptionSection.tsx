import React from 'react';
import styles from './TranscriptionSection.module.css';
import type { TranscriptionSectionProps } from '../types';

const TranscriptionSection: React.FC<TranscriptionSectionProps> = ({
  appState,
  interimText,
  transcriptionBoxRef,
  lineStartTimeRef,
  copyToClipboard,
  downloadText,
  downloadJson,
}) => {
  return (
    <div className={styles.transcriptionSection}>
      <div className={styles.transcriptionHeader}>
        <h3 className={styles.transcriptionTitle}>Transcription</h3>
        <div className={styles.actionButtons}>
          <button className={styles.actionBtn} onClick={copyToClipboard}>📋 Copy</button>
          <button className={styles.actionBtn} onClick={downloadText}>💾 TXT</button>
          <button className={styles.actionBtn} onClick={downloadJson}>📄 JSON</button>
        </div>
      </div>
      <div className={styles.transcriptionBox} id="transcriptionBox" ref={transcriptionBoxRef}>
        {appState.isRecording && appState.sessions.length === 0 && appState.currentText.length === 0 && interimText.length === 0 ? (
          <div style={{ color: '#667eea', fontStyle: 'italic' }}>🔴 Recording... Listening for audio input...</div>
        ) : (
          <>
            {appState.sessions.map((session, sessionIndex) => (
              <div key={sessionIndex}>
                <div className={styles.sessionTitle}>{session.title}</div>
                {session.lines.map((line, lineIndex) => (
                  <div key={lineIndex} className={styles.transcriptionLine}>
                    <span className={styles.timestamp}>
                      [{new Date(line.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}]
                    </span>
                    {line.text}
                  </div>
                ))}
              </div>
            ))}
            {(appState.currentText || interimText) && (
              <div className={styles.transcriptionLine}>
                {appState.isRecording && appState.activeSessionIndex !== null && (
                  <span className={styles.timestamp}>
                    [{new Date(lineStartTimeRef.current || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}]
                  </span>
                )}
                <span>{appState.currentText}</span>
                {interimText && <span className={styles.interimText}>{interimText}</span>}
              </div>
            )}
            {appState.sessions.length === 0 && appState.currentText.length === 0 && interimText.length === 0 && (
              <div className={styles.transcriptionPlaceholder}>
                Click the record button to start transcribing audio...
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TranscriptionSection;
