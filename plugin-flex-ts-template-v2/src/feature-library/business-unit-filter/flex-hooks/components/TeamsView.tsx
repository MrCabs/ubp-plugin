import * as Flex from '@twilio/flex-ui';

import { FlexComponent } from '../../../../types/feature-loader';
import { getBusinessUnitConfig } from '../../helpers/UnitHelper';

export const componentName = FlexComponent.TeamsView;
export const componentHook = function addBusinessUnitFilterToTeamsView(flex: typeof Flex, manager: Flex.Manager) {
  const config = getBusinessUnitConfig(manager);
  // Return early with no filter for admin (shows all teams)
  if (config === 'admin') return;

  // If null (empty/no business unit), show no teams
  if (!config) {
    flex.TeamsView.defaultProps.hiddenFilter = 'false = true';
    return;
  }

  flex.TeamsView.defaultProps.hiddenFilter = `data.attributes.business_unit CONTAINS "${config.business_unit}"`;
};
