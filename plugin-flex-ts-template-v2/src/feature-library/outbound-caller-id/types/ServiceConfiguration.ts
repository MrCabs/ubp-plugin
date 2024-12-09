export interface NumberTypeConfig {
  name: string;
  prefix?: string;
  callerIdGroup: string;
  priority: number;
}

export interface SipConfiguration {
  edge?: string;
  secure?: boolean;
  additional_params?: {
    [key: string]: string | number | boolean;
  };
}

export interface BusinessUnitCallerIds {
  [businessUnit: string]: {
    [callerIdGroup: string]: string[];
  };
}

export interface CarrierPrefixes {
  [carrier: string]: string[];
}

export interface OutboundCallerIdConfig {
  enabled: boolean;
  sip_address?: string;
  sip_config?: SipConfiguration;
  default_caller_id?: string;
  number_types?: NumberTypeConfig[];
  carrier_prefixes?: CarrierPrefixes;
  business_unit_caller_ids?: BusinessUnitCallerIds;
}

export default OutboundCallerIdConfig;
