import * as Flex from '@twilio/flex-ui';

import { FlexActionEvent, FlexAction } from '../../../../types/feature-loader';
import ActivityTimerManager from '../../helper/activityTimerManager';
import { STATUS_ON_HOLD } from '../../config';
import logger from '../../../../utils/logger';

export const actionEvent = FlexActionEvent.after;
export const actionName = FlexAction.CompleteTask;
export const actionHook = function afterCompleteTask(flex: typeof Flex, _manager: Flex.Manager) {
  flex.Actions.addListener(`${actionEvent}${actionName}`, async (payload) => {
    const { task } = payload;
    logger.info(`[ucc-activity-timer] Complete task action for task: ${task.sid}`);
    ActivityTimerManager.resetActivityTimer(STATUS_ON_HOLD);
  });
};
