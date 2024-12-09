import * as Flex from '@twilio/flex-ui';

import { OutboundCallerIdHelper } from '../../helpers/OutboundCallerIdHelper';
import { FlexActionEvent, FlexAction } from '../../../../types/feature-loader';
import { getConfig } from '../../config';
import { SipConfiguration } from '../../types/ServiceConfiguration';

export const actionEvent = FlexActionEvent.before;
export const actionName = FlexAction.StartOutboundCall;

interface StartOutboundCallPayload {
  destination: string;
  callerId?: string;
}

export const actionHook = function applyRandomCallerIdForDialedNumbers(flex: typeof Flex, _manager: Flex.Manager) {
  flex.Actions.addListener(`${actionEvent}${actionName}`, async (payload: StartOutboundCallPayload, _abortFunction) => {
    const config = getConfig();
    if (!config?.enabled) return;

    const { destination } = payload;
    if (!destination) return;

    // Get business unit caller IDs from configuration
    const businessUnitCallerIds = config.business_unit_caller_ids || {};

    // Get caller ID based on destination and business unit
    const { callerId } = OutboundCallerIdHelper.getCallerId(destination, businessUnitCallerIds);

    // If no caller ID found and no default provided, abort the call
    if (!callerId && !config.default_caller_id) {
      console.error('No caller ID found and no default configured');
      return;
    }

    // Update the payload with the selected caller ID
    payload.callerId = callerId || config.default_caller_id;

    // Format SIP destination if SIP address is configured
    if (config.sip_address) {
      // Build SIP URI parameters
      const params = new URLSearchParams();
      const sipConfig: SipConfiguration = config.sip_config || {};

      if (sipConfig.edge) {
        params.append('edge', sipConfig.edge);
      }
      if (typeof sipConfig.secure === 'boolean') {
        params.append('secure', sipConfig.secure.toString());
      }
      if (sipConfig.additional_params) {
        Object.entries(sipConfig.additional_params).forEach(([key, value]) => {
          if (value !== undefined) {
            params.append(key, value.toString());
          }
        });
      }

      // Format the destination with SIP URI parameters
      const paramsString = params.toString().replace(/&/g, ';');

      // Build the SIP URI
      const sipUri = paramsString
        ? `sip:${destination}@${config.sip_address};${paramsString}`
        : `sip:${destination}@${config.sip_address}`;

      // Use the full SIP URI for the actual call
      (payload as any).destination = sipUri;
    }
  });
};
