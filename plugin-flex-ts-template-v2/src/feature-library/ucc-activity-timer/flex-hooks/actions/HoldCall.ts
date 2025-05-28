import * as Flex from '@twilio/flex-ui';

import { FlexActionEvent, FlexAction } from '../../../../types/feature-loader';
import ActivityTimerManager from '../../helper/activityTimerManager';
import { STATUS_ON_HOLD } from '../../config';
import logger from '../../../../utils/logger';

export const actionEvent = FlexActionEvent.before;
export const actionName = FlexAction.HoldCall;
export const actionHook = function beforeHoldCall(flex: typeof Flex, _manager: Flex.Manager) {
  flex.Actions.addListener(`${actionEvent}${actionName}`, async (payload) => {
    const { task } = payload;
    logger.info(`[ucc-activity-timer] Hold call action for task: ${task.sid}`);

    // Reset any existing timer for this activity
    ActivityTimerManager.resetActivityTimer(STATUS_ON_HOLD);

    // Start a fresh timer for this hold action
    ActivityTimerManager.startActivityTimer(STATUS_ON_HOLD, task.sid);
    ActivityTimerManager.setTaskForActivityTimer(STATUS_ON_HOLD, task.sid);
  });
};
