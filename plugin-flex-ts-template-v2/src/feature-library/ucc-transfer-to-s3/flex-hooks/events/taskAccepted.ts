import * as Flex from '@twilio/flex-ui';

import { FlexEvent } from '../../../../types/feature-loader';
import logger from '../../../../utils/logger';

export const eventName = FlexEvent.taskAccepted;
export const eventHook = (flex: typeof Flex, _manager: Flex.Manager, task: Flex.ITask) => {
  logger.info(`[ucc-transfer-to-s3] Task accepted: ${task.sid}`);
  console.log('task+++++', task);
};

