import * as Flex from '@twilio/flex-ui';

import { FlexEvent } from '../../../../types/feature-loader';
import ActivityTimerManager from '../../helper/activityTimerManager';
import { LOCAL_STORAGE_KEY, REDUX_NAMESPACE } from '../../config';
import logger from '../../../../utils/logger';
import { ActivityTimerState } from '../../types/ActivityTimer';

// Key for storing worker's last activity status
const WORKER_LAST_STATUS_KEY = (workerSid: string) => `ucc_worker_last_status_${workerSid}`;

// Key for detecting page refresh vs tab close
const REFRESH_INDICATOR_KEY = 'ucc_page_refreshing';

export const eventName = FlexEvent.pluginsInitialized;
export const eventHook = (_flex: typeof Flex, _manager: Flex.Manager) => {
  window.addEventListener('storage', (event) => {
    const workerSid = _manager.workerClient?.sid;
    if (workerSid && event.key === null) {
      logger.info('[ucc-activity-timer] localStorage cleared, reinitializing timers');

      const state = _manager.store.getState() as any;
      const activityTimerState = state[REDUX_NAMESPACE]?.activityTimer as ActivityTimerState | undefined;

      if (activityTimerState && activityTimerState.timers) {
        Object.values(activityTimerState.timers).forEach((timerObj: any) => {
          const timer = timerObj as { activityName: string; timerType: string; accumulatedTime: number };

          if (timer.timerType === 'per-day') {
            logger.info(`Resetting per-day timer for ${timer.activityName} due to localStorage cleared`);
            ActivityTimerManager.resetActivityTimer(timer.activityName);
          }
        });
      }
    }
  });

  // Track page visibility changes
  document.addEventListener('visibilitychange', () => {
    logger.info(`[ucc-activity-timer] Page visibility changed: ${document.visibilityState}`);
  });

  // Store the worker's current activity status whenever it changes
  // Delay attaching the event listener to ensure workerClient is fully initialized
  setTimeout(() => {
    try {
      if (_manager.workerClient) {
        _manager.workerClient.on('activityUpdated', () => {
          try {
            const workerSid = _manager.workerClient?.sid;
            const activityName = _manager.workerClient?.activity?.name;

            if (workerSid && activityName) {
              logger.info(`[ucc-activity-timer] Storing worker activity status: ${activityName}`);
              localStorage.setItem(WORKER_LAST_STATUS_KEY(workerSid), activityName);
            }
          } catch (error: any) {
            logger.error('[ucc-activity-timer] Error in activityUpdated event handler', error as object);
          }
        });
      }
    } catch (error: any) {
      logger.error('[ucc-activity-timer] Error attaching activityUpdated event handler', error as object);
    }
  }, 2000); // 2 second delay to ensure workerClient is initialized

  window.addEventListener('beforeunload', () => {
    try {
      logger.info(`[ucc-activity-timer] handling beforeunload event`);

      // Check if this is a page refresh by looking for the refresh indicator in sessionStorage
      let isPageRefresh = false;
      try {
        isPageRefresh = sessionStorage.getItem(REFRESH_INDICATOR_KEY) === 'true';
        logger.info(`[ucc-activity-timer] Is page refresh: ${isPageRefresh}`);
      } catch (error: any) {
        logger.error('[ucc-activity-timer] Error checking refresh indicator', error as object);
      }

      // Safely get state
      let activityTimerState: ActivityTimerState | undefined;
      try {
        const state = _manager.store.getState() as any;
        activityTimerState = state[REDUX_NAMESPACE]?.activityTimer as ActivityTimerState | undefined;
      } catch (error: any) {
        logger.error('[ucc-activity-timer] Error getting state in beforeunload', error as object);
        return;
      }

      if (!activityTimerState || !activityTimerState.timers) {
        return;
      }

      const { timers } = activityTimerState;

      // Get current worker activity status
      const currentActivityName = _manager.workerClient?.activity?.name;
      const isOffline = currentActivityName === 'Offline';
      const workerSid = _manager.workerClient?.sid;

      // Store the current activity status before unload
      if (workerSid && currentActivityName) {
        try {
          logger.info(`[ucc-activity-timer] Storing worker activity status before unload: ${currentActivityName}`);
          localStorage.setItem(WORKER_LAST_STATUS_KEY(workerSid), currentActivityName);
        } catch (error: any) {
          logger.error('[ucc-activity-timer] Error storing worker status in beforeunload', error as object);
        }
      }

      // Always persist timer data regardless of refresh or close
      try {
        ActivityTimerManager.persistTimerData();
      } catch (error: any) {
        logger.error('[ucc-activity-timer] Error persisting timer data in beforeunload', error as object);
      }

      let isActualLogout = false;
      try {
        isActualLogout = localStorage.getItem('ucc_explicit_logout') === 'true';
      } catch (error: any) {
        logger.error('[ucc-activity-timer] Error checking logout flag in beforeunload', error as object);
      }

      logger.info(
        `[ucc-activity-timer] Event context: isActualLogout=${isActualLogout}, isOffline=${isOffline}, isPageRefresh=${isPageRefresh}`,
      );

      // If explicit logout OR (worker is offline AND this is not a page refresh)
      if (isActualLogout || (isOffline && !isPageRefresh)) {
        logger.info(
          '[ucc-activity-timer] Explicit logout or tab close with offline worker detected, resetting per-day timers',
        );

        try {
          Object.values(timers).forEach((timerObj: any) => {
            try {
              const timer = timerObj as { activityName: string; timerType: string };

              if (timer.timerType === 'per-day') {
                logger.info(`Resetting per-day timer for ${timer.activityName}`);
                ActivityTimerManager.resetActivityTimer(timer.activityName);

                if (workerSid) {
                  try {
                    localStorage.removeItem(LOCAL_STORAGE_KEY(workerSid));
                    logger.info(`Removed all timer data from localStorage for worker ${workerSid}`);
                  } catch (error: any) {
                    logger.error('[ucc-activity-timer] Error removing localStorage data', error as object);
                  }
                }
              }
            } catch (error: any) {
              logger.error('[ucc-activity-timer] Error processing timer in beforeunload', error as object);
            }
          });
        } catch (error: any) {
          logger.error('[ucc-activity-timer] Error iterating timers in beforeunload', error as object);
        }

        if (isActualLogout) {
          try {
            localStorage.removeItem('ucc_explicit_logout');
          } catch (error: any) {
            logger.error('[ucc-activity-timer] Error removing logout flag in beforeunload', error as object);
          }
        }
      } else {
        // For page refresh or tab close when worker is not offline
        logger.info('[ucc-activity-timer] Page refresh or tab close with active worker detected');

        // Only reset per-call timers
        try {
          Object.values(timers).forEach((timerObj: any) => {
            try {
              const timer = timerObj as { activityName: string; timerType: string };

              if (timer.timerType === 'per-call') {
                logger.info(`Resetting per-call timer for ${timer.activityName}`);
                ActivityTimerManager.resetActivityTimer(timer.activityName);
              }
            } catch (error: any) {
              logger.error('[ucc-activity-timer] Error processing per-call timer in beforeunload', error as object);
            }
          });
        } catch (error: any) {
          logger.error('[ucc-activity-timer] Error iterating per-call timers in beforeunload', error as object);
        }
      }
    } catch (error: any) {
      logger.error('[ucc-activity-timer] Uncaught error in beforeunload event handler', error as object);
    }
  });

  const workerSid = _manager.workerClient?.sid;

  _flex.Actions.addListener('afterLogout', () => {
    logger.info('[ucc-activity-timer] Flex Actions afterLogout event detected');

    const state = _manager.store.getState() as any;
    const activityTimerState = state[REDUX_NAMESPACE]?.activityTimer as ActivityTimerState | undefined;

    if (!activityTimerState || !activityTimerState.timers) {
      return;
    }

    const { timers } = activityTimerState;

    Object.values(timers).forEach((timerObj: any) => {
      const timer = timerObj as { activityName: string; timerType: string };

      if (timer.timerType === 'per-day') {
        logger.info(`Resetting per-day timer for ${timer.activityName} due to direct logout event`);
        ActivityTimerManager.resetActivityTimer(timer.activityName);

        if (workerSid) {
          localStorage.removeItem(LOCAL_STORAGE_KEY(workerSid));
          logger.info(`Removed all timer data from localStorage for worker ${workerSid}`);
        } else {
          logger.warn('[ucc-activity-timer] No worker SID available for cleanup');
        }
      }
    });
  });
};
