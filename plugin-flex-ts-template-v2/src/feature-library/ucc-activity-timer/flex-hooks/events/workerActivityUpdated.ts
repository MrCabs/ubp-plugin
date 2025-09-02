import * as Flex from '@twilio/flex-ui';

import { FlexEvent } from '../../../../types/feature-loader';
import ActivityTimerManager from '../../helper/activityTimerManager';
import Activity from '../../../../types/task-router/Activity';
import { getActivityTimerConfigs, REDUX_NAMESPACE } from '../../config';
import logger from '../../../../utils/logger';

export const eventName = FlexEvent.workerActivityUpdated;
const handlePerCallTimerLogic = (_manager: Flex.Manager, previousActivity: Activity, activity: Activity) => {
  if (previousActivity.name === 'On Hold' && activity.name === 'On a Call') {
    ActivityTimerManager.resetActivityTimer(previousActivity.name);
    return;
  }

  const state = _manager.store.getState() as any;
  const activityTimerState = state[REDUX_NAMESPACE]?.activityTimer;
  const timer = activityTimerState?.timers?.[previousActivity.name];

  if (!timer) return;

  if (timer.taskSid) {
    ActivityTimerManager.pauseActivityTimer(previousActivity.name);
  } else {
    ActivityTimerManager.resetActivityTimer(previousActivity.name);
  }
};

const handlePreviousActivityChange = (
  _manager: Flex.Manager,
  previousActivity: Activity,
  activity: Activity,
  activityTimerConfigs: Record<string, any>,
) => {
  const prevActivityConfig = activityTimerConfigs[previousActivity.name];

  if (!prevActivityConfig) {
    ActivityTimerManager.pauseActivityTimer(previousActivity.name);
    return;
  }

  if (prevActivityConfig.timerType === 'per-day') {
    ActivityTimerManager.pauseActivityTimer(previousActivity.name);
  } else if (prevActivityConfig.timerType === 'per-call') {
    handlePerCallTimerLogic(_manager, previousActivity, activity);
  }
};

const handleOfflineActivity = (_manager: Flex.Manager) => {
  logger.info('[ucc-activity-timer] Worker is now Offline');

  const state = _manager.store.getState() as any;
  const activityTimerState = state[REDUX_NAMESPACE]?.activityTimer;

  if (activityTimerState?.timers) {
    Object.keys(activityTimerState.timers).forEach((timerName) => {
      ActivityTimerManager.pauseActivityTimer(timerName);
    });
  }

  ActivityTimerManager.persistTimerData();
};

export const eventHook = (_flex: typeof Flex, _manager: Flex.Manager, activity: Activity) => {
  logger.info(`[ucc-activity-timer] handle ${eventName} for ${activity.name}`);

  const previousActivity = _manager.store.getState().flex.worker.activity;
  const activityTimerConfigs = getActivityTimerConfigs();

  if (previousActivity && previousActivity.name !== activity.name) {
    handlePreviousActivityChange(_manager, previousActivity, activity, activityTimerConfigs);
  }

  if (activity.name === 'Offline') {
    handleOfflineActivity(_manager);
    return;
  }

  ActivityTimerManager.startActivityTimer(activity.name);
};
