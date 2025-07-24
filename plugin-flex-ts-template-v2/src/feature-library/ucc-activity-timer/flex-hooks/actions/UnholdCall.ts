import * as Flex from '@twilio/flex-ui';

import { FlexActionEvent, FlexAction } from '../../../../types/feature-loader';
import ActivityTimerManager from '../../helper/activityTimerManager';
import { STATUS_ON_HOLD } from '../../config';
import logger from '../../../../utils/logger';

export const actionEvent = FlexActionEvent.before;
export const actionName = FlexAction.UnholdCall;
export const actionHook = function beforeUnholdCall(flex: typeof Flex, _manager: Flex.Manager) {
  flex.Actions.addListener(`${actionEvent}${actionName}`, async (payload) => {
    const { task } = payload;
    logger.info(`[ucc-activity-timer] Unhold call action for task: ${task.sid}`);

    // Reset the hold timer when unhoding (should start from zero next time)
    ActivityTimerManager.resetActivityTimer(STATUS_ON_HOLD);
  });
};
