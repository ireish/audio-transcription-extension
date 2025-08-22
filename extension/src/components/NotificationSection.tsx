import React from 'react';
import styles from './NotificationSection.module.css';
import type { NotificationSectionProps } from '../types';

const NotificationSection: React.FC<NotificationSectionProps> = ({ serverStatus, errorMessage, errorType, isRecording }) => {
  return (
    <div className={styles.notificationSection}>
      <h4 className={styles.statusHeader}>Status</h4>
      {serverStatus === 'offline' ? (
        <div className={`${styles.statusMessage} ${styles.error}`}>Server is offline. Please start the backend server.</div>
      ) : errorMessage ? (
        <div className={`${styles.statusMessage} ${errorType === 'success' ? styles.success : styles.error}`}>
          {errorMessage}
        </div>
      ) : serverStatus === 'online' && !isRecording ? (
        <div className={`${styles.statusMessage} ${styles.success}`}>Server is online. Ready to record.</div>
      ) : null}
    </div>
  );
};

export default NotificationSection;
