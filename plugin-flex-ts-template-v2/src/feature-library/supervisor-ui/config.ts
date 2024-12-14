import { getFeatureFlags } from '../../utils/configuration';
import SupervisorUiConfig from './types/ServiceConfiguration';

const { enabled = true } = (getFeatureFlags()?.features?.supervisor_ui as SupervisorUiConfig) || {};

export const isFeatureEnabled = () => {
  return enabled;
};
