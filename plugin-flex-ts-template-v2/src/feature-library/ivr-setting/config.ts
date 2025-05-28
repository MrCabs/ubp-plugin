import { getFeatureFlags } from '../../utils/configuration';
import IvrSettingConfig from './types/ServiceConfiguration';

const { enabled = false } = (getFeatureFlags()?.features?.ivr_setting as IvrSettingConfig) || {};

export const isFeatureEnabled = () => {
  return enabled;
};
