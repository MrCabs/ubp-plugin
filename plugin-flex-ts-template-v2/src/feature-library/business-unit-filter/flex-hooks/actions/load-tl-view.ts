import * as Flex from '@twilio/flex-ui';
import { Actions } from '@twilio/flex-ui';

import { FlexEvent } from '../../../../types/feature-loader';
import { isTechLeadViewEnabled } from '../../config';
import { NotificationIds } from '../notifications/BusinessUnitFilter';

export const eventName = FlexEvent.pluginsInitialized;
export const eventHook = function registerTlView(flex: typeof Flex, manager: Flex.Manager) {
  const myWorkerRoles = manager.store.getState().flex?.worker?.worker?.attributes?.roles;
  const business_unit = manager.workerClient?.attributes.business_unit;

  if (!business_unit) {
    flex.Notifications.showNotification(NotificationIds.MissingBusinessUnit as string);
  }

  if (isTechLeadViewEnabled()) return;

  console.log('🚀 ~ componentHook ~ myWorkerRoles:', myWorkerRoles);

  if (myWorkerRoles.includes('supervisor') || myWorkerRoles.includes('admin')) {
    Actions.invokeAction('NavigateToView', { viewName: 'agent-desktop' });
  }
};
