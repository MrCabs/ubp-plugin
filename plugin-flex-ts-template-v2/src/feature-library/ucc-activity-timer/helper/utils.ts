import { Manager } from '@twilio/flex-ui';

import { getTimerConfigForActivity } from '../config';

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'warning':
      return '#FFCC00';
    case 'exceeded':
      return '#FF5757';
    default:
      return '#4b71f1';
  }
};

export const truncateText = (text: string, maxWidth: number, ctx: CanvasRenderingContext2D): string => {
  let truncated = text;
  while (ctx.measureText(truncated).width > maxWidth && truncated.length > 0) {
    truncated = truncated.slice(0, -1);
  }
  if (truncated !== text) {
    truncated += '...';
  }
  return truncated;
};

export const isPiPSupported = (): boolean => {
  return 'pictureInPictureEnabled' in document;
};

// Input validation helpers
export const isValidActivityName = (activityName: any): activityName is string => {
  return (
    typeof activityName === 'string' &&
    activityName.length > 0 &&
    activityName.length <= 100 &&
    /^[a-zA-Z0-9\s\-_]+$/.test(activityName)
  );
};

export const isValidTaskSid = (taskSid: any): taskSid is string => {
  return typeof taskSid === 'string' && /^WT[a-f0-9]{32}$/.test(taskSid);
};

export const sanitizeActivityName = (activityName: string): string => {
  // Remove potentially harmful characters and normalize
  return activityName
    .replace(/[<>\"'&]/g, '') // Remove HTML/script injection chars
    .trim()
    .substring(0, 100); // Limit length
};

export const isTimerVisibleForWorker = (activityName: string): boolean => {
  // Input validation
  if (!isValidActivityName(activityName)) {
    console.warn('Invalid activity name provided to visibility check:', activityName);
    return false;
  }

  const timerConfig = getTimerConfigForActivity(activityName);

  if (!timerConfig || !timerConfig.visibleForBusinessUnits) {
    return true;
  }

  const worker = Manager.getInstance().workerClient;
  const workerBusinessUnit = worker?.attributes?.business_unit;

  if (!workerBusinessUnit || typeof workerBusinessUnit !== 'string') {
    return true;
  }

  // Validate business units array
  if (!Array.isArray(timerConfig.visibleForBusinessUnits)) {
    console.warn('Invalid visibleForBusinessUnits configuration:', timerConfig.visibleForBusinessUnits);
    return true;
  }

  return timerConfig.visibleForBusinessUnits.includes(workerBusinessUnit);
};
