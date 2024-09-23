import ActivityManager, { isWorkerCurrentlyInASystemActivity } from './ActivityManager';
import logger from '../../../utils/logger';
import { FlexHelper } from '../../../utils/helpers';
import { getSystemActivityNames } from '../config';

export async function handleActivityChange(actionType: 'hold' | 'unhold') {
  const { onHold, onATask, onATaskNoAcd } = getSystemActivityNames();

  const targetActivity = actionType === 'hold' ? onHold : onATask;
  const targetActivityObj = FlexHelper.getActivityByName(targetActivity);

  if (!targetActivityObj) {
    logger.warn(`${targetActivity} activity not found`);
    return;
  }

  const workerActivity = await FlexHelper.getWorkerActivity();
  const newActivity = workerActivity?.available ? targetActivity : onATaskNoAcd;

  const isCurrentlySystemActivity = await isWorkerCurrentlyInASystemActivity();

  if (!isCurrentlySystemActivity) {
    ActivityManager.storePendingActivityChange(workerActivity?.name || 'UNKNOWN');
  }

  await ActivityManager.setWorkerActivity(newActivity);
}
