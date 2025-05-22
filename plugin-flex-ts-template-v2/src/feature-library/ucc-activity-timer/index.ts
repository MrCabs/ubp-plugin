import { FeatureDefinition } from '../../types/feature-loader';
import { isFeatureEnabled } from './config';
import { initializeActivityTimer } from './helper/initActivityTimer';
// @ts-ignore
import hooks from './flex-hooks/**/*.*';

export const register = (): FeatureDefinition => {
  if (!isFeatureEnabled()) return {};

  // Initialize the timer
  initializeActivityTimer();
  return { name: 'ucc-activity-timer', hooks: typeof hooks === 'undefined' ? [] : hooks };
};
