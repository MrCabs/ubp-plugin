import { getFeatureFlags } from '../../utils/configuration';
import BusinessUnitFilterConfig from './types/ServiceConfiguration';

const { enabled = false, tech_lead_view = false } =
  (getFeatureFlags()?.features?.business_unit_filter as BusinessUnitFilterConfig) || {};

export const isFeatureEnabled = () => {
  return enabled;
};

export const isTechLeadViewEnabled = () => {
  return enabled && tech_lead_view;
};
