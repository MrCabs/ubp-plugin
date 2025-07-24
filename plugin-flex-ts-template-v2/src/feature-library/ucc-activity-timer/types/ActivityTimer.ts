export interface ActivityTimer {
  activityName: string;
  timerType: 'per-call' | 'per-day';
  elapsedTime: number;
  warningThreshold: number;
  exceededThreshold: number;
  status: 'normal' | 'warning' | 'exceeded';
  timerStart: number | null;
  isRunning: boolean;
  accumulatedTime: number;
  taskSid: string | null;
}

export interface ActivityTimerState {
  currentTimer: ActivityTimer | null;
  timers: {
    [key: string]: ActivityTimer;
  };
}

export interface PersistedTimerData {
  [activityName: string]: {
    accumulatedTime: number;
    lastUpdated: number;
    elapsedTime?: number;
    status?: 'normal' | 'warning' | 'exceeded';
    timerType?: 'per-call' | 'per-day';
    warningThreshold?: number;
    exceededThreshold?: number;
    activityName?: string;
  };
}

export interface TimerRestorePayload {
  timers: {
    [key: string]: ActivityTimer;
  };
  currentTimerName: string | null;
}

export interface TimerConfig {
  timerType: 'per-call' | 'per-day';
  warningThreshold: number;
  exceededThreshold: number;
  visibleForBusinessUnits?: string[];
}

export interface TimerDataType {
  activityName: string;
  formattedTime: string;
  status: 'normal' | 'warning' | 'exceeded';
}

export interface ActivityTimerProps {
  theme?: any;
}

export const DEFAULT_ACTIVITIES_CONFIG: Record<string, TimerConfig> = {
  'On Hold': {
    timerType: 'per-call',
    warningThreshold: 120,
    exceededThreshold: 300,
  },
  Break: {
    timerType: 'per-day',
    warningThreshold: 900,
    exceededThreshold: 1200,
  },
  Available: {
    timerType: 'per-day',
    warningThreshold: 14400,
    exceededThreshold: 21600,
  },
};
