import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import { ActivityTimer, ActivityTimerState, TimerRestorePayload } from '../../../types/ActivityTimer';

const initialState: ActivityTimerState = {
  currentTimer: null,
  timers: {},
};

const activityTimerSlice = createSlice({
  name: 'activityTimer',
  initialState,
  reducers: {
    startTimer(state, action: PayloadAction<ActivityTimer>) {
      const timer = action.payload;
      const existingTimer = state.timers[timer.activityName];

      if (existingTimer) {
        if (timer.timerType === 'per-day') {
          timer.accumulatedTime = existingTimer.accumulatedTime;
          timer.elapsedTime = 0;
        } else {
          timer.elapsedTime = existingTimer.elapsedTime;
        }
        timer.status = existingTimer.status;
      }

      timer.timerStart = Date.now();
      timer.isRunning = true;

      let totalElapsedTime = timer.elapsedTime;
      if (timer.timerType === 'per-day') {
        totalElapsedTime += timer.accumulatedTime;
      }

      if (totalElapsedTime >= timer.exceededThreshold) {
        timer.status = 'exceeded';
      } else if (totalElapsedTime >= timer.warningThreshold) {
        timer.status = 'warning';
      }

      state.timers[timer.activityName] = timer;
      state.currentTimer = timer;
    },

    pauseTimer(state, action: PayloadAction<string>) {
      const activityName = action.payload;
      const timer = state.timers[activityName];

      if (timer && timer.isRunning) {
        const elapsedSinceStart = (Date.now() - (timer.timerStart || 0)) / 1000;

        if (timer.timerType === 'per-day') {
          // For per-day timers, store time in accumulatedTime only
          timer.accumulatedTime += elapsedSinceStart;
          // Keep elapsedTime at 0 to avoid double counting
          timer.elapsedTime = 0;
        } else {
          // For per-call timers, store time in elapsedTime
          timer.elapsedTime += elapsedSinceStart;
        }

        timer.isRunning = false;
        timer.timerStart = null;

        // Calculate total time to update status
        let totalElapsedTime = timer.elapsedTime;
        if (timer.timerType === 'per-day') {
          totalElapsedTime += timer.accumulatedTime;
        }

        // Update status before pausing
        if (totalElapsedTime >= timer.exceededThreshold) {
          timer.status = 'exceeded';
        } else if (totalElapsedTime >= timer.warningThreshold) {
          timer.status = 'warning';
        }
      }
    },

    resetTimer(state, action: PayloadAction<string>) {
      const activityName = action.payload;
      if (state.timers[activityName]) {
        state.timers[activityName].elapsedTime = 0;
        state.timers[activityName].isRunning = false;
        state.timers[activityName].timerStart = null;

        if (state.timers[activityName].timerType === 'per-day') {
          state.timers[activityName].accumulatedTime = 0;
          state.timers[activityName].status = 'normal';
        }

        if (state.timers[activityName].timerType === 'per-call') {
          state.timers[activityName].taskSid = null;
        }
      }
    },

    updateTimerStatus(
      state,
      action: PayloadAction<{
        activityName: string;
        status: 'normal' | 'warning' | 'exceeded';
      }>,
    ) {
      const { activityName, status } = action.payload;
      if (state.timers[activityName]) {
        state.timers[activityName].status = status;
      }
    },

    setTaskForTimer(
      state,
      action: PayloadAction<{
        activityName: string;
        taskSid: string;
      }>,
    ) {
      const { activityName, taskSid } = action.payload;
      if (state.timers[activityName] && state.timers[activityName].timerType === 'per-call') {
        state.timers[activityName].taskSid = taskSid;
      }
    },

    updatePersistedTimers(state, action: PayloadAction<Record<string, number>>) {
      const persistedTimers = action.payload;

      Object.entries(persistedTimers).forEach(([activityName, accumulatedTime]) => {
        if (state.timers[activityName] && state.timers[activityName].timerType === 'per-day') {
          state.timers[activityName].accumulatedTime = accumulatedTime;
        }
      });
    },

    restoreTimers(state, action: PayloadAction<TimerRestorePayload>) {
      const { timers, currentTimerName } = action.payload;

      state.timers = {
        ...state.timers,
        ...timers,
      };

      if (currentTimerName && state.timers[currentTimerName]) {
        state.currentTimer = state.timers[currentTimerName];
      }
    },

    continueTimer(state, action: PayloadAction<{ activityName: string; taskSid: string }>) {
      const { activityName, taskSid } = action.payload;
      const timer = state.timers[activityName];

      if (timer && timer.taskSid === taskSid && !timer.isRunning) {
        timer.timerStart = Date.now();
        timer.isRunning = true;

        state.currentTimer = timer;
      }
    },
  },
});

export const {
  startTimer,
  pauseTimer,
  resetTimer,
  updateTimerStatus,
  setTaskForTimer,
  updatePersistedTimers,
  restoreTimers,
  continueTimer,
} = activityTimerSlice.actions;

export const reducerHook = () => ({ activityTimer: activityTimerSlice.reducer });
