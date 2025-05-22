import { Manager } from '@twilio/flex-ui';

import {
  startTimer,
  pauseTimer,
  resetTimer,
  updateTimerStatus,
  setTaskForTimer,
  updatePersistedTimers,
  continueTimer,
} from '../flex-hooks/states/ActivityTimer/reducer';
import { ActivityTimer, PersistedTimerData, ActivityTimerState } from '../types/ActivityTimer';
import {
  getTimerConfigForActivity,
  getDefaultWarningThreshold,
  getDefaultExceededThreshold,
  LOCAL_STORAGE_KEY,
  REDUX_NAMESPACE,
} from '../config';
import logger from '../../../utils/logger';

interface TimerDisplayData {
  activityName: string;
  formattedTime: string;
  status: 'normal' | 'warning' | 'exceeded';
}

class ActivityTimerManager {
  private updateInterval: NodeJS.Timeout | null = null;

  // eslint-disable-next-line no-restricted-syntax
  constructor() {
    this.loadPersistedTimers();

    this.startUpdateInterval();

    window.addEventListener('beforeunload', this.handleUnload);

    logger.info('ActivityTimerManager initialized');
  }

  initializeTimerForActivity(activityName: string, taskSid?: string): ActivityTimer | null {
    const timerConfig = getTimerConfigForActivity(activityName);

    if (!timerConfig) {
      return null;
    }

    const timer: ActivityTimer = {
      activityName,
      timerType: timerConfig.timerType,
      elapsedTime: 0,
      warningThreshold: timerConfig.warningThreshold || getDefaultWarningThreshold(),
      exceededThreshold: timerConfig.exceededThreshold || getDefaultExceededThreshold(),
      status: 'normal',
      timerStart: null,
      isRunning: false,
      accumulatedTime: 0,
      taskSid: taskSid || null,
    };

    if (timer.timerType === 'per-day') {
      const persistedData = this.getPersistedData();
      if (persistedData && persistedData[activityName]) {
        timer.accumulatedTime = persistedData[activityName].accumulatedTime;
      }
    }

    return timer;
  }

  startActivityTimer(activityName: string, taskSid?: string) {
    logger.info(`Starting activity timer for: ${activityName}, taskSid: ${taskSid || 'none'}`);

    const timer = this.initializeTimerForActivity(activityName, taskSid);

    if (timer) {
      Manager.getInstance().store.dispatch(startTimer(timer));
    }
  }

  startPersistedTimer(activityName: string) {
    logger.info(`Starting persisted timer for: ${activityName}`);

    const persistedData = this.getPersistedData();
    if (!persistedData || !persistedData[activityName]) {
      return this.startActivityTimer(activityName);
    }

    const timerConfig = getTimerConfigForActivity(activityName);
    if (!timerConfig) {
      return null;
    }

    const currentActivity = Manager.getInstance().workerClient?.activity;
    const isOffline = currentActivity?.name === 'Offline';
    if (isOffline && currentActivity?.name !== activityName) {
      logger.info(`Worker is offline, not starting timer for: ${activityName}`);
      return null;
    }

    const persistedTimerData = persistedData[activityName];

    if (timerConfig.timerType === 'per-call') {
      return this.startActivityTimer(activityName);
    }

    const isTooOld = persistedTimerData.lastUpdated && Date.now() - persistedTimerData.lastUpdated > 5 * 60 * 1000;

    if (isTooOld) {
      logger.info(`Timer data for ${activityName} is too old, starting fresh timer`);
      return this.startActivityTimer(activityName);
    }

    const timer: ActivityTimer = {
      activityName,
      timerType: timerConfig.timerType,
      elapsedTime: persistedTimerData.elapsedTime || 0,
      warningThreshold: timerConfig.warningThreshold || getDefaultWarningThreshold(),
      exceededThreshold: timerConfig.exceededThreshold || getDefaultExceededThreshold(),
      status: persistedTimerData.status || 'normal',
      timerStart: null,
      isRunning: false,
      accumulatedTime: persistedTimerData.accumulatedTime || 0,
      taskSid: null,
    };

    Manager.getInstance().store.dispatch(startTimer(timer));

    return timer;
  }

  pauseActivityTimer(activityName: string) {
    logger.info(`Pausing activity timer for: ${activityName}`);

    Manager.getInstance().store.dispatch(pauseTimer(activityName));
    this.persistTimerData();
  }

  resetActivityTimer(activityName: string) {
    logger.info(`Resetting activity timer for: ${activityName}`);

    const activityTimerState = this.getActivityTimerState();
    const timer = activityTimerState?.timers?.[activityName];

    if (!timer) {
      logger.info(`No timer found for activity: ${activityName}`);
      return;
    }

    if (timer.timerType === 'per-day') {
      logger.info(`Resetting per-day timer for: ${activityName}`);

      Manager.getInstance().store.dispatch(resetTimer(activityName));

      const workerSid = Manager.getInstance().workerClient?.sid;
      if (workerSid) {
        const persistedData = this.getPersistedData();
        if (persistedData && persistedData[activityName]) {
          const updatedData = { ...persistedData };

          if (updatedData[activityName]) {
            updatedData[activityName] = {
              ...updatedData[activityName],
              accumulatedTime: 0,
              elapsedTime: 0,
              status: 'normal',
              lastUpdated: Date.now(),
            };

            localStorage.setItem(LOCAL_STORAGE_KEY(workerSid), JSON.stringify(updatedData));
            logger.info(`Reset persisted data for per-day timer: ${activityName}`);
          }
        }
      }
    } else {
      Manager.getInstance().store.dispatch(resetTimer(activityName));
    }
  }

  setTaskForActivityTimer(activityName: string, taskSid: string) {
    logger.info(`Setting task for activity timer: ${activityName}, taskSid: ${taskSid}`);

    Manager.getInstance().store.dispatch(
      setTaskForTimer({
        activityName,
        taskSid,
      }),
    );
  }

  startUpdateInterval() {
    this.updateInterval = setInterval(() => {
      this.updateRunningTimers();
    }, 1000);
  }

  stopUpdateInterval() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  updateRunningTimers() {
    const activityTimerState = this.getActivityTimerState();

    if (!activityTimerState || !activityTimerState.timers) {
      return;
    }

    const { timers } = activityTimerState;

    Object.values(timers).forEach((timerObj: any) => {
      const timer = timerObj as ActivityTimer;

      const elapsedTime = this.calculateElapsedTime(timer);

      let status: 'normal' | 'warning' | 'exceeded' = 'normal';

      if (elapsedTime >= timer.exceededThreshold) {
        status = 'exceeded';
      } else if (elapsedTime >= timer.warningThreshold) {
        status = 'warning';
      }

      if (status !== timer.status) {
        Manager.getInstance().store.dispatch(
          updateTimerStatus({
            activityName: timer.activityName,
            status,
          }),
        );
      }
    });
  }

  handleUnload = () => {
    this.persistTimerData();
  };

  getPersistedData(): PersistedTimerData | null {
    const workerSid = Manager.getInstance().workerClient?.sid;

    if (!workerSid) {
      return null;
    }

    const key = LOCAL_STORAGE_KEY(workerSid);
    const storedData = localStorage.getItem(key);

    if (!storedData) {
      return null;
    }

    try {
      return JSON.parse(storedData) as PersistedTimerData;
    } catch (e) {
      logger.error('Failed to parse persisted timer data', e as object);
      return null;
    }
  }

  persistTimerData() {
    const workerSid = Manager.getInstance().workerClient?.sid;

    if (!workerSid) {
      return;
    }

    const activityTimerState = this.getActivityTimerState();

    if (!activityTimerState || !activityTimerState.timers) {
      return;
    }

    const { timers } = activityTimerState;

    const persistedData: PersistedTimerData = {};

    Object.values(timers).forEach((timerObj: any) => {
      const timer = timerObj as ActivityTimer;

      let totalElapsedTime = timer.elapsedTime;

      if (timer.isRunning && timer.timerStart) {
        totalElapsedTime += (Date.now() - timer.timerStart) / 1000;
      }

      if (timer.timerType === 'per-day') {
        persistedData[timer.activityName] = {
          accumulatedTime: timer.accumulatedTime + totalElapsedTime,
          elapsedTime: 0,
          status: timer.status,
          lastUpdated: Date.now(),
          timerType: timer.timerType,
          warningThreshold: timer.warningThreshold,
          exceededThreshold: timer.exceededThreshold,
        };
      } else {
        persistedData[timer.activityName] = {
          accumulatedTime: 0,
          elapsedTime: totalElapsedTime,
          status: timer.status,
          lastUpdated: Date.now(),
          timerType: timer.timerType,
          warningThreshold: timer.warningThreshold,
          exceededThreshold: timer.exceededThreshold,
        };
      }
    });

    if (activityTimerState.currentTimer) {
      persistedData.__currentTimer = {
        accumulatedTime: 0,
        lastUpdated: Date.now(),
        activityName: activityTimerState.currentTimer.activityName,
      };
    }

    const key = LOCAL_STORAGE_KEY(workerSid);
    localStorage.setItem(key, JSON.stringify(persistedData));

    logger.info('Persisted timer data to localStorage');
  }

  loadPersistedTimers() {
    const persistedData = this.getPersistedData();

    if (persistedData) {
      const timersToRestore: Record<string, ActivityTimer> = {};
      let currentTimerName: string | null = null;

      if (persistedData.__currentTimer && persistedData.__currentTimer.activityName) {
        currentTimerName = persistedData.__currentTimer.activityName;
      }

      Object.entries(persistedData).forEach(([activityName, data]) => {
        if (activityName.startsWith('__')) {
          return;
        }

        const timerConfig = getTimerConfigForActivity(activityName);

        if (timerConfig) {
          const timer: ActivityTimer = {
            activityName,
            timerType: data.timerType || timerConfig.timerType,
            elapsedTime: data.elapsedTime || 0,
            warningThreshold: data.warningThreshold || timerConfig.warningThreshold,
            exceededThreshold: data.exceededThreshold || timerConfig.exceededThreshold,
            status: data.status || 'normal',
            timerStart: null,
            isRunning: false,
            accumulatedTime: data.accumulatedTime || 0,
            taskSid: null,
          };

          let totalElapsedTime = timer.elapsedTime;
          if (timer.timerType === 'per-day') {
            totalElapsedTime += timer.accumulatedTime;
          }

          if (totalElapsedTime >= timer.exceededThreshold) {
            timer.status = 'exceeded';
          } else if (totalElapsedTime >= timer.warningThreshold) {
            timer.status = 'warning';
          }

          timersToRestore[activityName] = timer;
        }
      });

      const accumulatedTimesMap: Record<string, number> = {};
      Object.entries(timersToRestore).forEach(([activityName, timer]) => {
        if (timer.timerType === 'per-day') {
          accumulatedTimesMap[activityName] = timer.accumulatedTime;
        }
      });

      Manager.getInstance().store.dispatch(updatePersistedTimers(accumulatedTimesMap));

      logger.info('Loaded persisted timer data from localStorage');
    }
  }

  // Format seconds as HH:MM:SS
  formatTime(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // Calculate the current elapsed time for a timer
  calculateElapsedTime(timer: ActivityTimer): number {
    let elapsedTime = timer.elapsedTime;

    if (timer.isRunning && timer.timerStart) {
      elapsedTime += (Date.now() - timer.timerStart) / 1000;
    }

    // For per-day timers, include accumulated time
    if (timer.timerType === 'per-day') {
      elapsedTime += timer.accumulatedTime;
    }

    return elapsedTime;
  }

  getTimerData(timer: ActivityTimer): TimerDisplayData {
    const elapsedTime = this.calculateElapsedTime(timer);

    return {
      activityName: timer.activityName,
      formattedTime: this.formatTime(elapsedTime),
      status: timer.status,
    };
  }

  getCurrentTimerData(): TimerDisplayData | null {
    const activityTimerState = this.getActivityTimerState();

    if (!activityTimerState || !activityTimerState.currentTimer || !activityTimerState.timers) {
      return null;
    }

    const { currentTimer, timers } = activityTimerState;

    if (!currentTimer) {
      return null;
    }

    const timer = timers[currentTimer.activityName] as ActivityTimer;

    if (!timer) {
      return null;
    }

    return this.getTimerData(timer);
  }

  getAllTimersData(): TimerDisplayData[] {
    const activityTimerState = this.getActivityTimerState();

    if (!activityTimerState || !activityTimerState.timers) {
      return [];
    }

    const { timers } = activityTimerState;

    return Object.values(timers)
      .map((timerObj: any) => {
        const timer = timerObj as ActivityTimer;
        return this.getTimerData(timer);
      })
      .sort((a, b) => {
        const statusOrder = { exceeded: 0, warning: 1, normal: 2 };
        return statusOrder[a.status] - statusOrder[b.status];
      });
  }

  continueActivityTimer(activityName: string, taskSid: string) {
    logger.info(`Continuing activity timer for: ${activityName}, taskSid: ${taskSid}`);

    const activityTimerState = this.getActivityTimerState();
    const timer = activityTimerState?.timers?.[activityName];

    if (timer && timer.taskSid === taskSid) {
      Manager.getInstance().store.dispatch(
        continueTimer({
          activityName,
          taskSid,
        }),
      );
      return true;
    }

    return false;
  }

  clearPerDayTimers() {
    logger.info('Clearing all per-day activity timers');

    const activityTimerState = this.getActivityTimerState();
    if (!activityTimerState || !activityTimerState.timers) {
      return;
    }

    const { timers } = activityTimerState;

    Object.values(timers).forEach((timerObj: any) => {
      const timer = timerObj as ActivityTimer;

      if (timer.timerType === 'per-day') {
        logger.info(`Resetting per-day timer for ${timer.activityName}`);
        Manager.getInstance().store.dispatch(resetTimer(timer.activityName));
      }
    });

    const workerSid = Manager.getInstance().workerClient?.sid;
    if (workerSid) {
      localStorage.removeItem(LOCAL_STORAGE_KEY(workerSid));
      logger.info(`Removed all timer data from localStorage for worker ${workerSid}`);
    }
  }

  private getActivityTimerState(): ActivityTimerState | null {
    const state: any = Manager.getInstance().store.getState();
    if (state && state[REDUX_NAMESPACE] && state[REDUX_NAMESPACE].activityTimer) {
      return state[REDUX_NAMESPACE].activityTimer as ActivityTimerState;
    }
    return null;
  }
}

const ActivityTimerManagerSingleton = new ActivityTimerManager();
export default ActivityTimerManagerSingleton;
