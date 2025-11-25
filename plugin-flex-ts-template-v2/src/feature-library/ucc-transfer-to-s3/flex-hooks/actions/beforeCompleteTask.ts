import * as Flex from '@twilio/flex-ui';

import { FlexActionEvent, FlexAction } from '../../../../types/feature-loader';
import { getLambdaLink } from '../../config';
import logger from '../../../../utils/logger';

export const actionEvent = FlexActionEvent.before;
export const actionName = FlexAction.CompleteTask;
export const actionHook = function beforeCompleteTask(flex: typeof Flex, _manager: Flex.Manager) {
  flex.Actions.addListener(`${actionEvent}${actionName}`, async (payload) => {
    const { task } = payload;
    const { attributes } = task;

    logger.info(`[ucc-transfer-to-s3] Before complete task: ${task.sid}`);
    console.log('TASK++++++', payload);
    console.log('attributes+++++++++', attributes);

    // Extract the key from conference participants
    const key = attributes?.conference?.participants?.worker;

    if (!key) {
      logger.warn(`[ucc-transfer-to-s3] No worker participant key found for task: ${task.sid}`);
      return;
    }

    // Get the lambda link from configuration
    const lambdaLink = getLambdaLink();
    if (!lambdaLink) {
      logger.warn(`[ucc-transfer-to-s3] No lambda link configured`);
      return;
    }

    const newAttributes = { ...attributes };
    const current_reservation_attributes = attributes?.reservation_attributes || {};
    const reservationSid = task.sid;

    newAttributes.reservation_attributes = {
      ...current_reservation_attributes,
      [reservationSid]: {
        media: [
          {
            url_provider: `${lambdaLink}?key=${key}`,
            type: 'VoiceRecording',
          },
        ],
      },
    };

    task.setAttributes(newAttributes);

    logger.info(`[ucc-transfer-to-s3] Updated task attributes for task: ${task.sid}`);
    console.log('AFTER OBJECT ', task);
  });
};

