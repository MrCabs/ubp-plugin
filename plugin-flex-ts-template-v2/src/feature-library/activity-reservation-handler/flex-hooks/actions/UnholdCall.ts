import * as Flex from '@twilio/flex-ui';

import ProgrammableVoiceService from '../../../../utils/serverless/ProgrammableVoice/ProgrammableVoiceService';
import { FlexActionEvent, FlexAction } from '../../../../types/feature-loader';
import logger from '../../../../utils/logger';
import { handleActivityChange } from '../../helper/ActivityHoldHandler';

export const actionEvent = FlexActionEvent.before;
export const actionName = FlexAction.UnholdCall;
export const actionHook = function handleUnholdActivity(flex: typeof Flex, _manager: Flex.Manager) {
  flex.Actions.addListener(`${actionEvent}${actionName}`, async (payload, abortFunction) => {
    const { participantType, targetSid: participantSid, task } = payload;

    await handleActivityChange('unhold');

    if (participantType !== 'unknown') {
      return;
    }

    logger.info(`[conference] Unholding participant ${participantSid}`);

    const conferenceSid = task.conference?.conferenceSid || task.attributes?.conference?.sid;
    abortFunction();
    await ProgrammableVoiceService.unholdParticipant(conferenceSid, participantSid);
  });
};
