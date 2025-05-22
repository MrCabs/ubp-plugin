import * as Flex from '@twilio/flex-ui';

import { FlexEvent } from '../../../../types/feature-loader';
import ActivityTimerManager from '../../helper/activityTimerManager';
import { LOCAL_STORAGE_KEY, REDUX_NAMESPACE } from '../../config';
import logger from '../../../../utils/logger';

export const eventName = FlexEvent.taskCompleted;
export const eventHook = (_flex: typeof Flex, _manager: Flex.Manager, task: Flex.ITask) => {
  logger.info(`[ucc-activity-timer] handle ${eventName} for task ${task.sid}`);

  if (task.taskChannelUniqueName === 'voice') {
    const state = _manager.store.getState() as any;

    const activityTimerState = state[REDUX_NAMESPACE]?.activityTimer;

    if (!activityTimerState || !activityTimerState.timers) {
      return;
    }

    const { timers } = activityTimerState;

    Object.values(timers).forEach((timerObj: any) => {
      const timer = timerObj as {
        activityName: string;
        timerType: string;
        taskSid: string | null;
      };

      if (timer.timerType === 'per-call' && timer.taskSid === task.sid) {
        logger.info(`Resetting per-call timer for ${timer.activityName} due to task completion`);
        ActivityTimerManager.resetActivityTimer(timer.activityName);
      }
    });

    if (timers['On Hold'] && (timers['On Hold'].taskSid === task.sid || timers['On Hold'].taskSid === null)) {
      logger.info('Resetting On Hold timer due to task completion');
      ActivityTimerManager.resetActivityTimer('On Hold');
    }

    ActivityTimerManager.persistTimerData();

    const workerSid = _manager.workerClient?.sid;
    if (workerSid) {
      const persistedData = ActivityTimerManager.getPersistedData();
      if (persistedData) {
        let dataChanged = false;

        Object.keys(persistedData).forEach((key) => {
          const timerData = persistedData[key];
          if (
            !key.startsWith('__') &&
            timerData &&
            timerData.timerType === 'per-call' &&
            (key === 'On Hold' || (timerData as any).taskSid === task.sid)
          ) {
            timerData.accumulatedTime = 0;
            timerData.elapsedTime = 0;
            timerData.status = 'normal';
            timerData.lastUpdated = Date.now();
            dataChanged = true;
          }
        });

        if (dataChanged) {
          localStorage.setItem(LOCAL_STORAGE_KEY(workerSid), JSON.stringify(persistedData));
          logger.info('Reset per-call timers in localStorage due to task completion');
        }
      }
    }
  }
};
