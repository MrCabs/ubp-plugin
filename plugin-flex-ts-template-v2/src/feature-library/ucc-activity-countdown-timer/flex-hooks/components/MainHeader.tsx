import * as Flex from '@twilio/flex-ui';

import ActivityCountdownComponent from '../../custom-components/activity-countdown/ActivityCountdownComponent';
import { FlexComponent } from '../../../../types/feature-loader';

export const componentName = FlexComponent.MainHeader;
export const componentHook = function addActivityCountdownComponent(flex: typeof Flex, _manager: Flex.Manager) {
  flex.MainHeader.Content.add(<ActivityCountdownComponent key="activity-countdown" />, {
    sortOrder: -950,
    align: 'end',
  });
};
