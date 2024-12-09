import * as Flex from '@twilio/flex-ui';

import { StringTemplates } from '../strings/BusinessUnitFilter';

// Export the notification IDs as an enum for better maintainability
export enum NotificationIds {
  MissingBusinessUnit = 'PSMissingBusinessUnit',
}

export const notificationHook = (_flex: typeof Flex, _manager: Flex.Manager) => [
  {
    id: NotificationIds.MissingBusinessUnit,
    type: Flex.NotificationType.error,
    content: StringTemplates.MissingBusinessUnit,
    timeout: 0,
  },
];
