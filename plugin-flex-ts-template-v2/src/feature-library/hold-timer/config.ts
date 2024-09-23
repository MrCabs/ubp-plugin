import { getFeatureFlags } from '../../utils/configuration';
import HoldTimerConfig from './types/ServiceConfiguration';

const { enabled = false } = (getFeatureFlags()?.features?.hold_timer as HoldTimerConfig) || {};

export const isFeatureEnabled = () => {
  return enabled;
};
