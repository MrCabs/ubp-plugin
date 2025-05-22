import { AppState as FlexAppState } from '@twilio/flex-ui';

import { ActivityTimerState, TimerConfig } from './ActivityTimer';

export default interface ActivityTimerConfig {
  enabled: boolean;
  configuration: {
    activityTimers: Record<string, TimerConfig>;
    defaultWarningThreshold: number;
    defaultExceededThreshold: number;
  };
}

export interface AppState extends FlexAppState {
  flex: FlexAppState;
  activityTimer: ActivityTimerState;
}
