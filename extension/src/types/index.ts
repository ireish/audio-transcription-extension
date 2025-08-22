import React from "react";

export interface TranscriptionLine {
    text: string;
    timestamp: string;
}
  
export interface TranscriptionSession {
    title: string;
    lines: TranscriptionLine[];
}
  
export interface AppState {
    sessions: TranscriptionSession[];
    isRecording: boolean;
    activeSessionIndex: number | null;
    currentText: string;
    elapsedMs: number;
}

export interface RecordingSectionProps {
    isRecording: boolean;
    serverStatus: 'online' | 'offline' | 'checking';
    toggleRecording: () => void;
}

export interface NotificationSectionProps {
    serverStatus: 'online' | 'offline' | 'checking';
    errorMessage: string | null;
    errorType: 'success' | 'error';
    isRecording: boolean;
}

export interface TranscriptionSectionProps {
    appState: AppState;
    interimText: string;
    transcriptionBoxRef: React.RefObject<HTMLDivElement | null>;
    lineStartTimeRef: React.RefObject<string | null>;
    copyToClipboard: () => void;
    downloadText: () => void;
    downloadJson: () => void;
}
  
export interface TimerSectionProps {
    elapsedMs: number;
    formatTime: (ms: number) => string;
    clearAll: () => void;
}
