import * as Flex from '@twilio/flex-ui';

import logger from '../../../../utils/logger';

export const actionName = 'Logout';
export const actionHook = function interceptLogout(flex: typeof Flex, _manager: Flex.Manager) {
  flex.Actions.addListener(`before${actionName}`, async () => {
    logger.info('[ucc-activity-timer] Explicit logout detected, setting flag');

    localStorage.setItem('ucc_explicit_logout', 'true');

    return Promise.resolve();
  });
};
