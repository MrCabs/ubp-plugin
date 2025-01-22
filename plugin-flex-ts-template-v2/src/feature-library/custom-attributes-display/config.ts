import { getFeatureFlags } from '../../utils/configuration';
import CustomAttributesDisplayConfig from './types/ServiceConfiguration';

const { enabled = false } =
  (getFeatureFlags()?.features?.custom_attributes_display as CustomAttributesDisplayConfig) || {};

export const isFeatureEnabled = () => {
  return enabled;
};
