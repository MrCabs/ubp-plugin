import { getFeatureFlags } from '../../utils/configuration';
import ActivityReservationHandlerConfig from './types/ServiceConfiguration';

const {
  enabled = true,
  system_activity_names = {
    available: 'Available',
    onATask: 'On a Call',
    onATaskNoAcd: 'On a Task, No ACD',
    wrapup: 'Wrap Up',
    wrapupNoAcd: 'Wrap Up, No ACD',
    extendedWrapup: 'Extended Wrap Up',
    onHold: 'On Hold',
  },
} = (getFeatureFlags()?.features?.activity_reservation_handler as ActivityReservationHandlerConfig) || {};

export const isFeatureEnabled = () => {
  return enabled;
};

export const getSystemActivityNames = () => {
  return system_activity_names;
};
