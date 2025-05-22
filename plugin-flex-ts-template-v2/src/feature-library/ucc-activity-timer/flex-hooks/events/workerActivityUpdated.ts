import * as Flex from '@twilio/flex-ui';

import { FlexEvent } from '../../../../types/feature-loader';
import ActivityTimerManager from '../../helper/activityTimerManager';
import Activity from '../../../../types/task-router/Activity';
import { getActivityTimerConfigs, REDUX_NAMESPACE } from '../../config';
import logger from '../../../../utils/logger';

export const eventName = FlexEvent.workerActivityUpdated;
export const eventHook = (_flex: typeof Flex, _manager: Flex.Manager, activity: Activity) => {
  logger.info(`[ucc-activity-timer] handle ${eventName} for ${activity.name}`);

  const previousActivity = _manager.store.getState().flex.worker.activity;

  const activityTimerConfigs = getActivityTimerConfigs();

  if (previousActivity && previousActivity.name !== activity.name) {
    const prevActivityConfig = activityTimerConfigs[previousActivity.name];

    if (prevActivityConfig) {
      if (prevActivityConfig.timerType === 'per-day') {
        ActivityTimerManager.pauseActivityTimer(previousActivity.name);
      } else if (prevActivityConfig.timerType === 'per-call') {
        if (previousActivity.name === 'On Hold' && activity.name === 'On a Call') {
          ActivityTimerManager.pauseActivityTimer(previousActivity.name);
        } else {
          const state = _manager.store.getState() as any;
          const activityTimerState = state[REDUX_NAMESPACE]?.activityTimer;

          if (activityTimerState?.timers?.[previousActivity.name]) {
            const timer = activityTimerState.timers[previousActivity.name];
            if (timer.taskSid) {
              ActivityTimerManager.pauseActivityTimer(previousActivity.name);
            } else {
              ActivityTimerManager.resetActivityTimer(previousActivity.name);
            }
          }
        }
      }
    } else {
      ActivityTimerManager.pauseActivityTimer(previousActivity.name);
    }
  }

  const isOffline = activity.name === 'Offline';

  if (isOffline) {
    logger.info('[ucc-activity-timer] Worker is now Offline');

    const state = _manager.store.getState() as any;
    const activityTimerState = state[REDUX_NAMESPACE]?.activityTimer;

    if (activityTimerState && activityTimerState.timers) {
      Object.keys(activityTimerState.timers).forEach((timerName) => {
        ActivityTimerManager.pauseActivityTimer(timerName);
      });
    }

    ActivityTimerManager.persistTimerData();
    return;
  }

  ActivityTimerManager.startActivityTimer(activity.name);
};
