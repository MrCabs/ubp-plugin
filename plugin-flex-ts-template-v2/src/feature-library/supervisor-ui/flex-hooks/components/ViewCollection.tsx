import * as Flex from '@twilio/flex-ui';
import { View } from '@twilio/flex-ui';

import { SupervisorSettings } from '../../custom-components/SupervisorSettings';
import { FlexComponent } from '../../../../types/feature-loader';
import { isFeatureEnabled } from '../../config';

export const componentName = FlexComponent.ViewCollection;
export const componentHook = function SupervisorSettingsView(_manager: Flex.Manager) {
  if (!isFeatureEnabled()) {
    return;
  }

  Flex.ViewCollection.Content.add(
    <View name="supervisor-ui" key="supervisor-settings-view">
      <SupervisorSettings key="supervisor-settings-view-content" />
    </View>,
  );
};
