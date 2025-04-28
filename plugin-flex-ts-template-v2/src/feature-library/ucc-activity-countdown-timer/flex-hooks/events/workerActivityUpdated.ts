import * as Flex from '@twilio/flex-ui';

import { FlexEvent } from '../../../../types/feature-loader';
import { getActivityDurations } from '../../config';
import { resetCountdown, startCountdown } from '../reducers/ActivityCountdownTimer';
import logger from '../../../../utils/logger';
import Activity from '../../../../types/task-router/Activity';

export const eventName = FlexEvent.workerActivityUpdated;
export const eventHook = (flex: typeof Flex, manager: Flex.Manager, activity: Activity) => {
  logger.debug(`[ucc-activity-countdown-timer] Activity changed to ${activity.name}`);

  const activityDurations = getActivityDurations();
  const store = manager.store;

  // Check if the current activity has a configured countdown duration
  if (activityDurations[activity.name]) {
    const { duration } = activityDurations[activity.name];
    logger.info(
      `[ucc-activity-countdown-timer] Starting countdown for ${activity.name} with duration: ${duration} seconds`,
    );

    // Start the countdown
    store.dispatch(startCountdown(activity.name, duration));
  } else {
    // No countdown for this activity, reset any existing countdown
    logger.debug(`[ucc-activity-countdown-timer] No countdown configured for ${activity.name}`);
    store.dispatch(resetCountdown());
  }
};
