import { Manager } from '@twilio/flex-ui';

import {
  startTimer,
  pauseTimer,
  resetTimer,
  updateTimerStatus,
  setTaskForTimer,
  continueTimer,
  restoreTimers,
  removeTimer,
} from '../flex-hooks/states/ActivityTimer/reducer';
import { ActivityTimer, PersistedTimerData, ActivityTimerState } from '../types/ActivityTimer';
import {
  getTimerConfigForActivity,
  getDefaultWarningThreshold,
  getDefaultExceededThreshold,
  LOCAL_STORAGE_KEY,
  REDUX_NAMESPACE,
} from '../config';
import { isTimerVisibleForWorker, isValidActivityName, isValidTaskSid, sanitizeActivityName } from './utils';
import logger from '../../../utils/logger';

// Type guards for safe casting
function isActivityTimer(obj: any): obj is ActivityTimer {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.activityName === 'string' &&
    typeof obj.timerType === 'string' &&
    (obj.timerType === 'per-call' || obj.timerType === 'per-day') &&
    typeof obj.elapsedTime === 'number' &&
    typeof obj.warningThreshold === 'number' &&
    typeof obj.exceededThreshold === 'number' &&
    typeof obj.status === 'string' &&
    (obj.status === 'normal' || obj.status === 'warning' || obj.status === 'exceeded') &&
    typeof obj.isRunning === 'boolean' &&
    typeof obj.accumulatedTime === 'number'
  );
}

function isActivityTimerState(obj: any): obj is ActivityTimerState {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.timers === 'object' &&
    (obj.currentTimer === null || isActivityTimer(obj.currentTimer))
  );
}

interface TimerDisplayData {
  activityName: string;
  formattedTime: string;
  status: 'normal' | 'warning' | 'exceeded';
}

class ActivityTimerManager {
  private updateInterval: NodeJS.Timeout | null = null;

  private isUpdating: boolean = false;

  private isPersisting: boolean = false;

  private pendingOperations: Array<() => void> = [];

  private operationLock: boolean = false;

  // eslint-disable-next-line no-restricted-syntax
  constructor() {
    this.loadPersistedTimers();

    this.startUpdateInterval();

    window.addEventListener('beforeunload', this.handleUnload);

    logger.info('ActivityTimerManager initialized');
  }

  // Public methods start here
  initializeTimerForActivity(activityName: string, taskSid?: string): ActivityTimer | null {
    // Input validation and sanitization
    if (!isValidActivityName(activityName)) {
      logger.warn('Invalid activity name provided to timer initialization', { activityName });
      return null;
    }

    if (taskSid && !isValidTaskSid(taskSid)) {
      logger.warn('Invalid task SID provided to timer initialization', { taskSid });
      return null;
    }

    const sanitizedActivityName = sanitizeActivityName(activityName);
    const timerConfig = getTimerConfigForActivity(sanitizedActivityName);

    if (!timerConfig) {
      return null;
    }

    if (!isTimerVisibleForWorker(sanitizedActivityName)) {
      logger.info(`Timer for ${sanitizedActivityName} not visible for current worker's business unit`);
      return null;
    }

    const timer: ActivityTimer = {
      activityName: sanitizedActivityName,
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

    if (!isTimerVisibleForWorker(activityName)) {
      logger.info(`Timer for ${activityName} not visible for current worker's business unit`);
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

  removeActivityTimer(activityName: string) {
    logger.info(`Removing activity timer for: ${activityName}`);

    const activityTimerState = this.getActivityTimerState();
    const timer = activityTimerState?.timers?.[activityName];

    if (!timer) {
      logger.info(`No timer found for activity: ${activityName}`);
      return;
    }

    // Remove from Redux store
    Manager.getInstance().store.dispatch(removeTimer(activityName));

    // Remove from localStorage for per-day timers
    if (timer.timerType === 'per-day') {
      const workerSid = Manager.getInstance().workerClient?.sid;
      if (workerSid) {
        const persistedData = this.getPersistedData();
        if (persistedData && persistedData[activityName]) {
          const updatedData = { ...persistedData };
          delete updatedData[activityName];
          localStorage.setItem(LOCAL_STORAGE_KEY(workerSid), JSON.stringify(updatedData));
          logger.info(`Removed persisted data for: ${activityName}`);
        }
      }
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
    if (this.isUpdating || this.isPersisting) {
      logger.debug('Skipping timer update - operation in progress');
      return;
    }

    this.withLock(async () => {
      this.isUpdating = true;

      const activityTimerState = this.getActivityTimerState();

      if (!activityTimerState || !activityTimerState.timers) {
        return;
      }

      const { timers } = activityTimerState;
      const statusUpdates: Array<() => void> = [];

      Object.values(timers).forEach((timerObj: any) => {
        if (!isActivityTimer(timerObj)) {
          logger.warn('Invalid timer object in state', { timerObj });
          return;
        }

        const timer = timerObj;
        const elapsedTime = this.calculateElapsedTime(timer);

        let status: 'normal' | 'warning' | 'exceeded' = 'normal';

        if (elapsedTime >= timer.exceededThreshold) {
          status = 'exceeded';
        } else if (elapsedTime >= timer.warningThreshold) {
          status = 'warning';
        }

        if (status !== timer.status) {
          statusUpdates.push(() => {
            Manager.getInstance().store.dispatch(
              updateTimerStatus({
                activityName: timer.activityName,
                status,
              }),
            );
          });
        }
      });

      // Batch all status updates
      if (statusUpdates.length > 0) {
        this.batchStateUpdates(statusUpdates);
      }
    }).finally(() => {
      this.isUpdating = false;
    });
  }

  handleUnload = () => {
    this.persistTimerData();
  };

  getPersistedData(): PersistedTimerData | null {
    const workerSid = Manager.getInstance().workerClient?.sid;

    if (!workerSid) {
      logger.warn('Cannot get persisted data: no worker SID available');
      return null;
    }

    const key = LOCAL_STORAGE_KEY(workerSid);

    try {
      const storedData = localStorage.getItem(key);

      if (!storedData) {
        return null;
      }

      const parsedData = JSON.parse(storedData);

      if (!this.isValidPersistedData(parsedData)) {
        logger.warn('Invalid persisted timer data structure, clearing corrupted data');
        localStorage.removeItem(key);
        return null;
      }

      return parsedData as PersistedTimerData;
    } catch (e) {
      if (e instanceof SyntaxError) {
        logger.error('Failed to parse persisted timer data: invalid JSON', { error: e.message });
      } else if (e instanceof DOMException && e.name === 'SecurityError') {
        logger.error('LocalStorage access denied: security error', { error: e.message });
      } else {
        logger.error('Unexpected error reading persisted timer data', e as object);
      }

      // Attempt to clear corrupted data
      try {
        localStorage.removeItem(key);
      } catch (clearError) {
        logger.error('Failed to clear corrupted timer data', clearError as object);
      }

      return null;
    }
  }

  persistTimerData(): boolean {
    if (this.isPersisting) {
      logger.debug('Skipping persist - already in progress');
      return false;
    }

    this.isPersisting = true;

    try {
      const workerSid = Manager.getInstance().workerClient?.sid;

      if (!workerSid) {
        logger.warn('Cannot persist timer data: no worker SID available');
        return false;
      }

      // Check storage availability and quota
      if (!this.checkStorageQuota()) {
        logger.error('LocalStorage quota exceeded, cannot persist timer data');
        return false;
      }

      const activityTimerState = this.getActivityTimerState();

      if (!activityTimerState || !activityTimerState.timers) {
        logger.warn('No timer state available to persist');
        return false;
      }

      const { timers } = activityTimerState;
      const persistedData: PersistedTimerData = {};

      // Validate and sanitize timer data before persisting
      Object.values(timers).forEach((timerObj: any) => {
        if (!isActivityTimer(timerObj)) {
          logger.warn('Skipping invalid timer data', { timerObj });
          return;
        }

        const timer = timerObj;

        let totalElapsedTime = timer.elapsedTime || 0;

        if (timer.isRunning && timer.timerStart) {
          const elapsedSinceStart = (Date.now() - timer.timerStart) / 1000;
          // Sanity check: elapsed time shouldn't be negative or unreasonably large
          if (elapsedSinceStart >= 0 && elapsedSinceStart < 86400) {
            // Less than 24 hours
            totalElapsedTime += elapsedSinceStart;
          }
        }

        // Sanitize numeric values
        const accumulatedTime = Math.max(0, timer.accumulatedTime || 0);
        const sanitizedElapsedTime = Math.max(0, totalElapsedTime);

        if (timer.timerType === 'per-day') {
          persistedData[timer.activityName] = {
            accumulatedTime: accumulatedTime + sanitizedElapsedTime,
            elapsedTime: 0,
            status: timer.status || 'normal',
            lastUpdated: Date.now(),
            timerType: timer.timerType,
            warningThreshold: timer.warningThreshold || 0,
            exceededThreshold: timer.exceededThreshold || 0,
          };
        } else {
          persistedData[timer.activityName] = {
            accumulatedTime: 0,
            elapsedTime: sanitizedElapsedTime,
            status: timer.status || 'normal',
            lastUpdated: Date.now(),
            timerType: timer.timerType,
            warningThreshold: timer.warningThreshold || 0,
            exceededThreshold: timer.exceededThreshold || 0,
          };
        }
      });

      if (activityTimerState.currentTimer && activityTimerState.currentTimer.activityName) {
        persistedData.__currentTimer = {
          accumulatedTime: 0,
          lastUpdated: Date.now(),
          activityName: activityTimerState.currentTimer.activityName,
        };
      }

      const key = LOCAL_STORAGE_KEY(workerSid);
      const dataString = JSON.stringify(persistedData);

      // Check if data string is too large (most browsers have ~5-10MB limit)
      if (dataString.length > 5000000) {
        // 5MB limit
        logger.error('Timer data too large to persist', { size: dataString.length });
        return false;
      }

      localStorage.setItem(key, dataString);
      logger.info('Successfully persisted timer data to localStorage', {
        timersCount: Object.keys(persistedData).length,
        dataSize: dataString.length,
      });
      return true;
    } catch (e) {
      if (e instanceof DOMException) {
        if (e.name === 'QuotaExceededError') {
          logger.error('LocalStorage quota exceeded while persisting timer data');
          // Attempt cleanup of old data
          this.cleanupOldStorageData();
        } else if (e.name === 'SecurityError') {
          logger.error('LocalStorage access denied: security error');
        } else {
          logger.error('LocalStorage operation failed', { name: e.name, message: e.message });
        }
      } else {
        logger.error('Unexpected error persisting timer data', e as object);
      }
      return false;
    } finally {
      this.isPersisting = false;
    }
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

        if (timerConfig && isTimerVisibleForWorker(activityName)) {
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

      // Restore timers using the proper action that handles both timers and current timer
      Manager.getInstance().store.dispatch(
        restoreTimers({
          timers: timersToRestore,
          currentTimerName,
        }),
      );

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

    if (!isTimerVisibleForWorker(currentTimer.activityName)) {
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
      .filter((timerObj: any): timerObj is ActivityTimer => {
        if (!isActivityTimer(timerObj)) {
          logger.warn('Invalid timer object in getAllTimersData', { timerObj });
          return false;
        }
        return true;
      })
      .map((timer) => this.getTimerData(timer))
      .filter((timerData) => isTimerVisibleForWorker(timerData.activityName))
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
      if (!isActivityTimer(timerObj)) {
        logger.warn('Invalid timer object in clearPerDayTimers', { timerObj });
        return;
      }

      const timer = timerObj;
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

  // Synchronization helpers
  private async withLock<T>(operation: () => T | Promise<T>): Promise<T | null> {
    if (this.operationLock) {
      // Queue the operation for later execution
      return new Promise<T>((resolve, reject) => {
        this.pendingOperations.push(async () => {
          try {
            const result = await operation();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
      });
    }

    this.operationLock = true;
    try {
      return await operation();
    } catch (error) {
      logger.error('Error in synchronized operation', error as object);
      throw error;
    } finally {
      this.operationLock = false;
      // Process pending operations
      if (this.pendingOperations.length > 0) {
        const nextOperation = this.pendingOperations.shift();
        if (nextOperation) {
          setTimeout(nextOperation, 0); // Execute asynchronously
        }
      }
    }
  }

  private batchStateUpdates(updates: Array<() => void>): void {
    // Use React's unstable_batchedUpdates equivalent for Redux
    // This ensures all state updates are batched together
    updates.forEach((update) => update());
  }

  private isValidPersistedData(data: any): data is PersistedTimerData {
    if (!data || typeof data !== 'object') return false;

    // Check if all entries are valid timer data
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('__')) continue; // Skip metadata entries

      if (!value || typeof value !== 'object') return false;

      const timerData = value as any;
      if (
        typeof timerData.accumulatedTime !== 'number' ||
        typeof timerData.lastUpdated !== 'number' ||
        timerData.lastUpdated < 0 ||
        timerData.accumulatedTime < 0
      ) {
        return false;
      }
    }
    return true;
  }

  private checkStorageQuota(): boolean {
    try {
      const testKey = '__storage_test__';
      const testData = 'x'.repeat(1024); // 1KB test
      localStorage.setItem(testKey, testData);
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  private shouldRemoveTimerData(parsed: any, cutoffTime: number): boolean {
    for (const [timerKey, timerData] of Object.entries(parsed)) {
      if (timerKey.startsWith('__')) continue;
      const lastUpdated = (timerData as any)?.lastUpdated;
      if (lastUpdated && lastUpdated < cutoffTime) {
        return true;
      }
    }
    return false;
  }

  private processStorageItem(key: string, cutoffTime: number): void {
    try {
      const data = localStorage.getItem(key);
      if (!data) return;

      const parsed = JSON.parse(data);
      if (this.shouldRemoveTimerData(parsed, cutoffTime)) {
        localStorage.removeItem(key);
        logger.info('Cleaned up old timer data', { key });
      }
    } catch (error) {
      // If we can't parse an item, remove it as it's likely corrupted
      localStorage.removeItem(key);
      logger.info('Removed corrupted timer data', { key });
    }
  }

  private cleanupOldStorageData(): void {
    try {
      // Remove items older than 7 days
      const cutoffTime = Date.now() - 7 * 24 * 60 * 60 * 1000;

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.includes('ucc_activity_timer_state_')) continue;

        this.processStorageItem(key, cutoffTime);
      }
    } catch (error) {
      logger.error('Error during storage cleanup', error as object);
    }
  }

  private getActivityTimerState(): ActivityTimerState | null {
    const state: any = Manager.getInstance().store.getState();
    if (state && state[REDUX_NAMESPACE] && state[REDUX_NAMESPACE].activityTimer) {
      const timerState = state[REDUX_NAMESPACE].activityTimer;
      if (isActivityTimerState(timerState)) {
        return timerState;
      }
      logger.warn('Invalid activity timer state structure', { timerState });
    }
    return null;
  }
}

const ActivityTimerManagerSingleton = new ActivityTimerManager();
export default ActivityTimerManagerSingleton;
