import * as Flex from '@twilio/flex-ui';

import { FlexActionEvent, FlexAction } from '../../../../types/feature-loader';
import { handleActivityChange } from '../../helper/ActivityHoldHandler';

export const actionEvent = FlexActionEvent.before;
export const actionName = FlexAction.HoldCall;
export const actionHook = function setHoldActivityBeforeHoldCall(flex: typeof Flex, _manager: Flex.Manager) {
  flex.Actions.addListener(`${actionEvent}${actionName}`, async (_payload, _abortFunction) => {
    await handleActivityChange('hold');
  });
};
