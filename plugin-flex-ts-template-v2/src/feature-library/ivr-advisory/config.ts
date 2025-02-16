import { getFeatureFlags } from '../../utils/configuration';
import IvrAdvisoryConfig from './types/ServiceConfiguration';

const { enabled = false } = (getFeatureFlags()?.features?.ivr_advisory as IvrAdvisoryConfig) || {};

export const isFeatureEnabled = () => {
  return enabled;
};
