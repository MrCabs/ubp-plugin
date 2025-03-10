import { getFeatureFlags } from '../../utils/configuration';
import type { OutboundCallerIdConfig, SelectConfig } from './types/ServiceConfiguration';

export const isFeatureEnabled = (): boolean => {
  return getFeatureFlags()?.features?.outbound_caller_id?.enabled || false;
};

export const getConfig = (): OutboundCallerIdConfig | null => {
  const config = getFeatureFlags()?.features?.outbound_caller_id;

  if (!config?.enabled) return null;

  return {
    enabled: config.enabled,
    default_caller_id: config.default_caller_id,
    sip_address: config.sip_address,
    sip_config: config.sip_config,
    business_unit_caller_ids: config.business_unit_caller_ids,
    carrier_prefixes: config.carrier_prefixes,
    number_types: config.number_types,
  };
};

export const getSipAddressValue = (sipAddress: string | SelectConfig | undefined): string | undefined => {
  if (typeof sipAddress === 'string') {
    return sipAddress;
  }
  if (sipAddress && 'type' in sipAddress && sipAddress.type === 'select') {
    return sipAddress.value;
  }
  return undefined;
};
