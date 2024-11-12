import * as Flex from '@twilio/flex-ui';

import { NotificationIds } from '../flex-hooks/notifications/BusinessUnitFilter';
import { getBusinessUnits } from '../config';

/**
 * Gets the business unit configuration from the Flex manager
 * @param manager - Flex Manager instance
 * @returns Business unit configuration, null for empty/null business unit, or 'admin' for admin users
 */
export function getBusinessUnitConfig(manager: Flex.Manager):
  | {
      business_unit: string;
      ui_business_units: Record<string, string[]>;
    }
  | null
  | 'admin' {
  const business_unit = manager.workerClient?.attributes.business_unit;
  const ui_business_units = getBusinessUnits();

  // Show everything for admin users
  if (business_unit?.toLowerCase() === 'admin') {
    return 'admin';
  }

  // Return null if business_unit is empty/null (show nothing)
  if (!business_unit || !ui_business_units) {
    return null;
  }

  return {
    business_unit,
    ui_business_units,
  };
}

/**
 * Gets task queues for a specific business unit
 * @param business_unit - Business unit name
 * @param ui_business_units - Map of business units to their task queues
 * @returns Array of task queue names
 */
export function getTaskQueuesForBusinessUnit(
  business_unit: string,
  ui_business_units: Record<string, string[]>,
): string[] {
  return ui_business_units[business_unit] || [];
}

/**
 * Maps task queues to their corresponding skills
 * @param taskQueues - Array of task queue names
 * @param taskRouterSkills - Array of available TaskRouter skills
 * @returns Array of matching skills
 */
export function getSkillsForTaskQueues(
  taskQueues: string[],
  taskRouterSkills: TaskRouterSkill[] = [],
): TaskRouterSkill[] {
  return taskQueues.reduce((skills: TaskRouterSkill[], queue: string) => {
    const matchingSkills = taskRouterSkills.filter((skill) => queue === skill.name);
    return [...skills, ...matchingSkills];
  }, []);
}

interface TaskRouterSkill {
  [key: string]: any;
  name: string;
}

/**
 * Shows a notification to contact admin when business unit is missing
 */
export function showMissingBusinessUnitNotification(flex: typeof Flex) {
  flex.Notifications.showNotification(NotificationIds.MissingBusinessUnit as any);
}
