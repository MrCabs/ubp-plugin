import { reduxNamespace } from '../../../../utils/state';

// Define a type for the slice state
export interface ActivityCountdownTimerState {
  activityName: string | null;
  startTime: number | null;
  totalDuration: number | null;
  isRunning: boolean;
}

// Define the initial state
const initialState: ActivityCountdownTimerState = {
  activityName: null,
  startTime: null,
  totalDuration: null,
  isRunning: false,
};

// Create action types
const START_COUNTDOWN = 'activityCountdownTimer/startCountdown';
const RESET_COUNTDOWN = 'activityCountdownTimer/resetCountdown';

// Create action creators
export const startCountdown = (activityName: string, duration: number) => ({
  type: START_COUNTDOWN,
  payload: { activityName, duration },
});

export const resetCountdown = () => ({
  type: RESET_COUNTDOWN,
});

// Create reducer
const activityCountdownTimerReducer = (state = initialState, action: any) => {
  switch (action.type) {
    case START_COUNTDOWN:
      return {
        ...state,
        activityName: action.payload.activityName,
        startTime: Date.now(),
        totalDuration: action.payload.duration,
        isRunning: true,
      };
    case RESET_COUNTDOWN:
      return {
        ...state,
        activityName: null,
        startTime: null,
        totalDuration: null,
        isRunning: false,
      };
    default:
      return state;
  }
};

// Export reducer hook
export const reducerHook = () => ({ activityCountdownTimer: activityCountdownTimerReducer });

// Selector to get the countdown state from the global redux state
export const selectCountdownState = (state: any): ActivityCountdownTimerState =>
  state[reduxNamespace]?.activityCountdownTimer || initialState;
