import { getFeatureFlags } from '../../utils/configuration';
import UccActivityCountdownTimerConfig, { ActivityDurations } from './types/ServiceConfiguration';

const {
  enabled = false,
  activity_durations = {
    'On Hold': { duration: 300 }, // 5 minutes default
    'Bio Break': { duration: 3600 }, // 1 hour default
  },
} = (getFeatureFlags()?.features?.ucc_activity_countdown_timer as UccActivityCountdownTimerConfig) || {};

export const isFeatureEnabled = () => {
  return enabled;
};

export const getActivityDurations = (): ActivityDurations => {
  return activity_durations;
};
