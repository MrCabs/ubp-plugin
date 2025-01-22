import { ITask } from '@twilio/flex-ui';

import { DisplayConfig, DisplayElement } from '../types/ServiceConfiguration';

export const getDisplayConfig = (task: ITask): DisplayConfig | null => {
  if (!task?.attributes?.display) return null;

  // Handle the case where display is already an array
  if (Array.isArray(task.attributes.display)) {
    return task.attributes.display.map((element) => validateDisplayElement(element));
  }

  // Handle legacy case where display is a single object
  if (typeof task.attributes.display === 'object') {
    return [validateDisplayElement(task.attributes.display)];
  }

  return null;
};

const validateDisplayElement = (element: any): DisplayElement => {
  if (!element.type || !element.attributes) {
    throw new Error('Invalid display element structure');
  }

  // Ensure severity is one of the allowed values
  if (element.options?.severity && !['error', 'warning', 'neutral'].includes(element.options.severity)) {
    element.options.severity = 'neutral';
  }

  return {
    type: element.type,
    attributes: element.attributes,
    options: element.options || {},
  };
};
