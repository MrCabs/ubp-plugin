import { getFeatureFlags } from '../../utils/configuration';
import MicrophoneMonitoringConfig from './types/ServiceConfiguration';

export const getConfig = () => {
  return getFeatureFlags()?.features?.microphone_monitoring as MicrophoneMonitoringConfig;
}

export const isFeatureEnabled = () => {
  return getConfig()?.enabled;
};

export const getBusinessUnit = () => {
  return getConfig()?.configuration.business_units || [];
};