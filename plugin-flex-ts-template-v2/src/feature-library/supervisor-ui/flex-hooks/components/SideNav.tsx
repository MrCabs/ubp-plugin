import * as Flex from '@twilio/flex-ui';

import SideNavigationIcon from '../../custom-components/SideNavigation/SideNavigationIcon';
import { FlexComponent } from '../../../../types/feature-loader';
import { isFeatureEnabled } from '../../config';

export const componentName = FlexComponent.SideNav;
export const componentHook = function SupervisorUiSideNav(flex: typeof Flex, _manager: Flex.Manager) {
  if (!isFeatureEnabled()) {
    return;
  }

  flex.SideNav.Content.add(<SideNavigationIcon key="supervisor-ui-side-nav" viewName="supervisor-ui" />, {
    sortOrder: 100,
  });
};
