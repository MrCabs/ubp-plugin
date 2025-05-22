import * as Flex from '@twilio/flex-ui';

import { FlexEvent } from '../../../../types/feature-loader';
import ActivityTimerManager from '../../helper/activityTimerManager';
import { REDUX_NAMESPACE } from '../../config';
import logger from '../../../../utils/logger';

export const eventName = FlexEvent.taskUpdated;
export const eventHook = (_flex: typeof Flex, _manager: Flex.Manager, task: Flex.ITask) => {
  logger.info(`[ucc-activity-timer] handle ${eventName} for task ${task.sid}`);

  if (task.taskChannelUniqueName === 'voice') {
    const state = _manager.store.getState() as any;
    const activityTimerState = state[REDUX_NAMESPACE]?.activityTimer;

    if (!activityTimerState || !activityTimerState.timers) {
      return;
    }

    const { timers } = activityTimerState;

    const isOnHold = Flex.TaskHelper.isCallOnHold(task);
    const holdTimer = timers['On Hold'];

    if (isOnHold) {
      if (!holdTimer || !holdTimer.isRunning) {
        logger.info(`Starting On Hold timer for task ${task.sid}`);
        ActivityTimerManager.startActivityTimer('On Hold', task.sid);
      } else if (holdTimer.taskSid !== task.sid) {
        logger.info(`Updating On Hold timer with task ${task.sid}`);
        ActivityTimerManager.setTaskForActivityTimer('On Hold', task.sid);
      }
    } else if (holdTimer && holdTimer.isRunning && holdTimer.taskSid === task.sid) {
      logger.info(`Pausing On Hold timer for task ${task.sid}`);
      ActivityTimerManager.pauseActivityTimer('On Hold');
    }

    ActivityTimerManager.persistTimerData();
  }
};
