import React from 'react';
import styles from './TimerSection.module.css';
import type { TimerSectionProps } from '../types';

// interface TimerSectionProps {
//   elapsedMs: number;
//   formatTime: (ms: number) => string;
//   clearAll: () => void;
// }

const TimerSection: React.FC<TimerSectionProps> = ({ elapsedMs, formatTime, clearAll }) => {
  return (
    <div className={styles.timerSection}>
      <span className={styles.timerTitle}>Session time: </span>
      <div className={styles.timer} id="timer">{formatTime(elapsedMs)}</div>
      <button className={styles.actionBtn} onClick={clearAll} style={{ marginLeft: '10px' }}>Clear Transcripts</button>
    </div>
  );
};

export default TimerSection;
