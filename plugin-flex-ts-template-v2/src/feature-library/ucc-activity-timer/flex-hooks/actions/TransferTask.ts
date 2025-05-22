import * as Flex from '@twilio/flex-ui';

import { FlexActionEvent, FlexAction } from '../../../../types/feature-loader';
import ActivityTimerManager from '../../helper/activityTimerManager';
import { STATUS_ON_HOLD } from '../../config';
import logger from '../../../../utils/logger';

export const actionEvent = FlexActionEvent.before;
export const actionName = FlexAction.TransferTask;
export const actionHook = function beforeTransferTask(flex: typeof Flex, _manager: Flex.Manager) {
  flex.Actions.addListener(`${actionEvent}${actionName}`, async (payload) => {
    const { task } = payload;
    logger.info(`[ucc-activity-timer] Transfer task action for task: ${task.sid}`);

    ActivityTimerManager.pauseActivityTimer(STATUS_ON_HOLD);
  });
};
