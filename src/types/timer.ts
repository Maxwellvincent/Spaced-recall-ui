export type TimerType = 'pomodoro' | 'continuous';

export type TimerState = 'idle' | 'running' | 'paused' | 'break' | 'completed';

export interface ThemeTimerMessages {
  start: string;
  pause: string;
  resume: string;
  break: string;
  complete: string;
  reset: string;
}

export const THEME_TIMER_MESSAGES: Record<string, ThemeTimerMessages> = {
  classic: {
    start: "Start Focus Session",
    pause: "Pause Session",
    resume: "Resume Session",
    break: "Take a Break",
    complete: "Session Complete!",
    reset: "Reset Timer"
  },
  dbz: {
    start: "Enter Hyperbolic Time Chamber",
    pause: "Pause Training",
    resume: "Resume Training",
    break: "Senzu Bean Break",
    complete: "Training Complete! Power Level Increased!",
    reset: "Reset Time Chamber"
  },
  naruto: {
    start: "Enter Sage Mode",
    pause: "Release Jutsu",
    resume: "Resume Training",
    break: "Chakra Recovery",
    complete: "Training Complete! New Jutsu Mastered!",
    reset: "Reset Chakra"
  },
  hogwarts: {
    start: "Begin Spell Practice",
    pause: "Pause Incantation",
    resume: "Resume Practice",
    break: "Butterbeer Break",
    complete: "Practice Complete! Spell Mastered!",
    reset: "Finite Incantatem"
  }
};

export interface TimerSettings {
  type: TimerType;
  pomodoroLength: number; // in minutes
  breakLength: number; // in minutes
  longBreakLength: number; // in minutes
  sessionsBeforeLongBreak: number;
}

export interface IdleConfig {
  idleThreshold: number; // time in seconds before considered idle
  maxIdleTime: number; // maximum time in seconds to track as idle before pausing
}

export interface TimerSession {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // in seconds
  type: TimerType;
  state: TimerState;
  completedIntervals?: number;
  theme: string;
  associatedWorkItem?: string; // ID of associated work item if any
  overtime?: number; // in seconds
  isOvertime: boolean;
  idleTime: number; // total accumulated idle time in seconds
  activeTime: number; // actual focused time in seconds
}

export interface OvertimeInfo {
  isOvertime: boolean;
  overtimeDuration: number; // in seconds
  originalDuration: number; // in seconds
}

// Default timer settings
export const DEFAULT_TIMER_SETTINGS: TimerSettings = {
  type: 'pomodoro',
  pomodoroLength: 25,
  breakLength: 5,
  longBreakLength: 15,
  sessionsBeforeLongBreak: 4
};

// Default idle detection settings
export const DEFAULT_IDLE_CONFIG: IdleConfig = {
  idleThreshold: 300, // 5 minutes before considered idle
  maxIdleTime: 1800 // auto-pause after 30 minutes of idle
}; 