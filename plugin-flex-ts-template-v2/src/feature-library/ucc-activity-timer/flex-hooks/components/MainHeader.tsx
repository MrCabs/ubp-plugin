import * as Flex from '@twilio/flex-ui';

import ActivityTimer from '../../custom-components/ActivityTimer';
import { FlexComponent } from '../../../../types/feature-loader';

export const componentName = FlexComponent.MainHeader;
export const componentHook = function addActivityTimerToMainHeader(flex: typeof Flex) {
  flex.MainHeader.Content.add(<ActivityTimer key="activity-timer" />, {
    sortOrder: 1,
    align: 'end',
  });
};
