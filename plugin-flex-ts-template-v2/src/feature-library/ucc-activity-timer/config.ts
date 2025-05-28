import { getFeatureFlags } from '../../utils/configuration';
import ActivityTimerConfig from './types/ServiceConfiguration';
import { TimerConfig, DEFAULT_ACTIVITIES_CONFIG } from './types/ActivityTimer';

export const REDUX_NAMESPACE = 'plugin-flex-ts-template-v2';

export const STATUS_ON_HOLD = 'On Hold';

export const LOCAL_STORAGE_KEY = (workerSid: string) => `ucc_activity_timer_state_${workerSid}`;

export const getConfig = () => {
  return getFeatureFlags()?.features?.ucc_activity_timer as ActivityTimerConfig;
};

export const isFeatureEnabled = () => {
  return getConfig()?.enabled;
};

export const getActivityTimerConfigs = () => {
  return {
    ...DEFAULT_ACTIVITIES_CONFIG,
    ...(getConfig()?.configuration?.activityTimers || {}),
  };
};

export const getTimerConfigForActivity = (activityName: string): TimerConfig | undefined => {
  const activityTimers = getActivityTimerConfigs();
  return activityTimers[activityName];
};

export const getDefaultWarningThreshold = (): number => {
  return getConfig()?.configuration?.defaultWarningThreshold || 300;
};

export const getDefaultExceededThreshold = (): number => {
  return getConfig()?.configuration?.defaultExceededThreshold || 600;
};
