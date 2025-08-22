import React from 'react';
import styles from './RecordingSection.module.css';
import type { RecordingSectionProps } from '../types';

const RecordingSection: React.FC<RecordingSectionProps> = ({ isRecording, serverStatus, toggleRecording }) => {
  return (
    <div className={styles.recordingSection}>
      <button
        onClick={toggleRecording}
        className={`${styles.recordButton} ${isRecording ? styles.recording : ''}`}
        disabled={serverStatus !== 'online'}
      >
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </button>
      <label className={styles.micCheckbox}>
        <input
          type="checkbox"
          checked={false}
          onChange={() => {}}
          disabled
        />
        <span>Microphone</span>
      </label>
    </div>
  );
};

export default RecordingSection;
