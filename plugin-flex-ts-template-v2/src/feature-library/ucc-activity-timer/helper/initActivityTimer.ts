import { Manager, TaskHelper } from '@twilio/flex-ui';

import ActivityTimerManager from './activityTimerManager';
import { restoreTimers } from '../flex-hooks/states/ActivityTimer/reducer';
import { getActivityTimerConfigs, LOCAL_STORAGE_KEY } from '../config';
import logger from '../../../utils/logger';
import { ActivityTimer } from '../types/ActivityTimer';

// Key for storing worker's last activity status
const WORKER_LAST_STATUS_KEY = (workerSid: string) => `ucc_worker_last_status_${workerSid}`;

// Key for detecting page refresh vs tab close
const REFRESH_INDICATOR_KEY = 'ucc_page_refreshing';

export const initializeActivityTimer = async () => {
  logger.info('Initializing UCC Activity Timer');

  // Set a flag in sessionStorage to detect page refresh
  // This flag will persist during page refresh but will be cleared when the tab is closed
  try {
    sessionStorage.setItem(REFRESH_INDICATOR_KEY, 'true');
  } catch (error: any) {
    logger.error('[ucc-activity-timer] Error setting refresh indicator', error as object);
  }

  setupLogoutDetection();

  const activityTimerConfigs = getActivityTimerConfigs();
  const workerSid = Manager.getInstance().workerClient?.sid;

  // Check if worker went offline after tab close
  if (workerSid) {
    try {
      const currentActivityName = Manager.getInstance().workerClient?.activity?.name;
      let lastActivityName = null;

      try {
        lastActivityName = localStorage.getItem(WORKER_LAST_STATUS_KEY(workerSid));
      } catch (error: any) {
        logger.error('[ucc-activity-timer] Error getting last activity status', error as object);
      }

      logger.info(`[ucc-activity-timer] Current activity: ${currentActivityName}, Last activity: ${lastActivityName}`);

      // Check if this is a page refresh by looking for the refresh indicator in sessionStorage
      let isPageRefresh = false;
      try {
        isPageRefresh = sessionStorage.getItem(REFRESH_INDICATOR_KEY) === 'true';
      } catch (error: any) {
        logger.error('[ucc-activity-timer] Error checking refresh indicator', error as object);
      }

      logger.info(`[ucc-activity-timer] Is page refresh: ${isPageRefresh}`);

      // Only clear localStorage if:
      // 1. This is NOT a page refresh (the tab was closed and reopened)
      // 2. The worker is currently offline
      // 3. The worker was previously in a different status
      if (!isPageRefresh && currentActivityName === 'Offline' && lastActivityName && lastActivityName !== 'Offline') {
        logger.info('[ucc-activity-timer] Worker went offline after tab close, clearing timer data');

        try {
          localStorage.removeItem(LOCAL_STORAGE_KEY(workerSid));
        } catch (error: any) {
          logger.error('[ucc-activity-timer] Error removing timer data', error as object);
        }

        // Update the stored status to match current status
        try {
          if (currentActivityName) {
            localStorage.setItem(WORKER_LAST_STATUS_KEY(workerSid), currentActivityName);
          }
        } catch (error: any) {
          logger.error('[ucc-activity-timer] Error updating activity status', error as object);
        }

        // No need to restore timers since we just cleared them
        return true;
      }

      logger.info('[ucc-activity-timer] Preserving timer data (page refresh or worker not offline)');

      // Update the stored status to match current status
      try {
        if (currentActivityName) {
          localStorage.setItem(WORKER_LAST_STATUS_KEY(workerSid), currentActivityName);
        }
      } catch (error: any) {
        logger.error('[ucc-activity-timer] Error updating activity status', error as object);
      }
    } catch (error: any) {
      logger.error('[ucc-activity-timer] Error checking worker status', error as object);
    }
  }

  const persistedData = ActivityTimerManager.getPersistedData();

  const timersToRestore: Record<string, ActivityTimer> = {};
  let currentTimerName: string | null = null;

  if (persistedData) {
    if (persistedData.__currentTimer && persistedData.__currentTimer.activityName) {
      currentTimerName = persistedData.__currentTimer.activityName;
    }

    Object.entries(persistedData).forEach(([activityName, data]) => {
      if (activityName.startsWith('__')) {
        return;
      }

      const timerConfig = activityTimerConfigs[activityName];
      if (timerConfig) {
        const timer: ActivityTimer = {
          activityName,
          timerType: timerConfig.timerType,
          elapsedTime: data.elapsedTime || 0,
          warningThreshold: timerConfig.warningThreshold,
          exceededThreshold: timerConfig.exceededThreshold,
          status: data.status || 'normal',
          timerStart: null,
          isRunning: false,
          accumulatedTime: data.accumulatedTime || 0,
          taskSid: null,
        };

        if (timerConfig.timerType === 'per-day') {
          timersToRestore[activityName] = timer;
        } else if (timerConfig.timerType === 'per-call' && Date.now() - data.lastUpdated < 60 * 1000) {
          const tasks = Manager.getInstance().store.getState().flex.worker.tasks;
          let shouldRestore = false;

          if (tasks) {
            if (activityName === 'On Hold') {
              tasks.forEach((task) => {
                if (
                  task.taskChannelUniqueName === 'voice' &&
                  task.status === 'accepted' &&
                  (task as any).inHoldParticipant
                ) {
                  shouldRestore = true;
                  timer.taskSid = task.sid;
                }
              });
            } else if ((timer as any).taskSid) {
              shouldRestore = tasks.has((timer as any).taskSid);
            }
          }

          if (shouldRestore) {
            timersToRestore[activityName] = timer;
          }
        }
      }
    });

    if (Object.keys(timersToRestore).length > 0) {
      logger.info('Restoring persisted timers', { timers: Object.keys(timersToRestore) });
      Manager.getInstance().store.dispatch(
        restoreTimers({
          timers: timersToRestore,
          currentTimerName,
        }),
      );
    }
  }

  const currentActivity = Manager.getInstance().workerClient?.activity;

  const isOffline = currentActivity?.name === 'Offline';

  if (currentActivity && activityTimerConfigs[currentActivity.name]) {
    const activityName = currentActivity.name;
    const timerConfig = activityTimerConfigs[activityName];

    logger.info(`Initializing timer for current activity: ${activityName}`);

    if (timersToRestore[activityName]) {
      ActivityTimerManager.startActivityTimer(activityName);
    } else if (timerConfig) {
      if (timerConfig.timerType === 'per-day' && persistedData && persistedData[activityName]) {
        logger.info(`Restoring per-day timer for ${activityName} from persisted data`);
        ActivityTimerManager.startPersistedTimer(activityName);
      } else {
        logger.info(`Starting fresh timer for ${activityName}`);
        ActivityTimerManager.startActivityTimer(activityName);
      }
    }
  }

  if (isOffline) {
    logger.info('Worker is offline, not initializing other activity timers');
    return true;
  }

  const tasks = Manager.getInstance().store.getState().flex.worker.tasks;
  if (tasks) {
    tasks.forEach((task) => {
      const isOnHold = TaskHelper.isCallOnHold(task);

      if (isOnHold) {
        logger.info(`Found task on hold, initializing Hold timer for task: ${task.sid}`);
        ActivityTimerManager.startActivityTimer('On Hold', task.sid);
        ActivityTimerManager.setTaskForActivityTimer('On Hold', task.sid);
      }
    });
  }

  return true;
};

/**
 * Setup logout detection by monitoring token changes and worker status
 */
const setupLogoutDetection = () => {
  try {
    Manager.getInstance().events.addListener('tokenUpdated', () => {
      try {
        logger.info('[ucc-activity-timer] Token updated, checking if logout');

        const isOffline = Manager.getInstance().workerClient?.activity?.name === 'Offline';

        if (isOffline) {
          logger.info('[ucc-activity-timer] Worker is offline during token update, treating as logout');
          try {
            ActivityTimerManager.clearPerDayTimers();
          } catch (error: any) {
            logger.error('[ucc-activity-timer] Error clearing timers during token update', error as object);
          }
        }
      } catch (error: any) {
        logger.error('[ucc-activity-timer] Error in tokenUpdated event handler', error as object);
      }
    });

    const tokenExpirationCheck = setInterval(() => {
      try {
        let tokenInfo;
        try {
          tokenInfo = Manager.getInstance().store.getState().flex.session.ssoTokenPayload;
        } catch (error: any) {
          logger.error('[ucc-activity-timer] Error getting token info', error as object);
          return;
        }

        if (!tokenInfo || !tokenInfo.token) {
          logger.info('[ucc-activity-timer] No valid token found, possible logout detected');

          const workerSid = Manager.getInstance().workerClient?.sid;
          if (workerSid) {
            try {
              localStorage.removeItem(LOCAL_STORAGE_KEY(workerSid));
              logger.info(`Removed all timer data from localStorage for worker ${workerSid}`);
            } catch (error: any) {
              logger.error('[ucc-activity-timer] Error removing localStorage data during token check', error as object);
            }
          }

          try {
            ActivityTimerManager.clearPerDayTimers();
          } catch (error: any) {
            logger.error('[ucc-activity-timer] Error clearing timers during token check', error as object);
          }

          clearInterval(tokenExpirationCheck);
        }
      } catch (error: any) {
        logger.error('[ucc-activity-timer] Error in token expiration check', error as object);
      }
    }, 60000);
  } catch (error: any) {
    logger.error('[ucc-activity-timer] Error setting up logout detection', error as object);
  }
};
