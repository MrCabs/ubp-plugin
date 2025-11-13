import { getFeatureFlags } from '../../utils/configuration';
import MicrophoneMonitoringConfig from './types/ServiceConfiguration';

const { enabled = false, business_units } = (getFeatureFlags()?.features?.microphone_monitoring as MicrophoneMonitoringConfig) || {};

export const isFeatureEnabled = () => {
  return enabled;
};

export const getBusinessUnit = () => {
  return business_units;
};