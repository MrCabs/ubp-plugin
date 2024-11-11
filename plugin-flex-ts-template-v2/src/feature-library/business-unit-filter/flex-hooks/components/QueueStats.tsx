import * as Flex from '@twilio/flex-ui';

import { FlexComponent } from '../../../../types/feature-loader';
import { getBusinessUnitConfig, getTaskQueuesForBusinessUnit } from '../../helpers/UnitHelper';

export const componentName = FlexComponent.QueueStats;
export const componentHook = function addBusinessUnitFilterToQueueStats(flex: typeof Flex, manager: Flex.Manager) {
  const config = getBusinessUnitConfig(manager);
  // Return early with no filter for admin (shows all queues)
  if (config === 'admin') return;

  // If null (empty/no business unit), show no queues
  if (!config) {
    flex.QueuesStats.setSubscriptionFilter(() => false);
    return;
  }

  const taskQueues = getTaskQueuesForBusinessUnit(config.business_unit, config.ui_business_units);
  flex.QueuesStats.setSubscriptionFilter((queue: { friendly_name: string }) =>
    taskQueues.includes(queue.friendly_name),
  );
};
