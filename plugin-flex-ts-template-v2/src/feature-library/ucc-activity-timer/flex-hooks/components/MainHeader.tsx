import * as Flex from '@twilio/flex-ui';

import ActivityTimerWithPiP from '../../custom-components/ActivityTimerWithPiP';
import { FlexComponent } from '../../../../types/feature-loader';

export const componentName = FlexComponent.MainHeader;
export const componentHook = function addActivityTimerToMainHeader(flex: typeof Flex) {
  flex.MainHeader.Content.add(<ActivityTimerWithPiP key="activity-timer" />, {
    sortOrder: 1,
    align: 'end',
  });
};
