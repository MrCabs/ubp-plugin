import { getFeatureFlags } from '../../utils/configuration';
import SupervisorUiConfig from './types/ServiceConfiguration';

const { enabled = true, enable_audit_logging = true } =
  (getFeatureFlags()?.features?.supervisor_ui as SupervisorUiConfig) || {};

const { features = {} } = getFeatureFlags();

export const isFeatureEnabled = () => {
  return enabled;
};

export const isAuditLoggingEnabled = () => {
  return enable_audit_logging;
};

const {
  audio_key = '',
  audio_service_url = '',
  asset_folder_name = '',
} = getFeatureFlags()?.features.supervisor_ui?.ivr_advisory || {};

const {
  display_agent_automation = true,
  display_ivr_setting = true,
  display_ivr_advisory = true,
} = getFeatureFlags()?.features.supervisor_ui?.applied_setting || {};

export const isAgentAutomationEnabled = () => {
  return enabled && display_agent_automation;
};

export const isIvrSettingEnabled = () => {
  return enabled && display_ivr_setting;
};

export const isIvrAdvisoryEnabled = () => {
  return enabled && display_ivr_advisory;
};

export const getFeaturesConfig = () => {
  return features;
};

export const getAudioKey = () => {
  return audio_key;
};

export const getAudioUrl = () => {
  return audio_service_url;
};

export const getAssetFolderName = () => {
  return asset_folder_name;
};
