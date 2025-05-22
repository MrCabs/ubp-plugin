export interface AttributeConfig {
  ivr_enabled: boolean;
  bcp_mode: boolean;
  last_updated: string;
  updated_by: string;
}

export default interface IvrSettingConfig {
  enabled: boolean;
  configuration: Array<AttributeConfig>;
}
