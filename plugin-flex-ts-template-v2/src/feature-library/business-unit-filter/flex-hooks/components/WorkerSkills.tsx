import * as Flex from '@twilio/flex-ui';

import { getBusinessUnitConfig, getTaskQueuesForBusinessUnit, getSkillsForTaskQueues } from '../../helpers/UnitHelper';

export const componentHook = function addBusinessUnitFilterToWorkerSkills(flex: typeof Flex, manager: Flex.Manager) {
  const config = getBusinessUnitConfig(manager);
  // For admin, show all skills
  if (config === 'admin') {
    if (flex.WorkerSkills && 'defaultProps' in flex.WorkerSkills) {
      (flex.WorkerSkills.defaultProps as { availableSkills?: any[] }).availableSkills =
        manager.serviceConfiguration.taskrouter_skills || [];
    }
    return;
  }

  // If null (empty/no business unit), show no skills
  if (!config) {
    if (flex.WorkerSkills && 'defaultProps' in flex.WorkerSkills) {
      (flex.WorkerSkills.defaultProps as { availableSkills?: any[] }).availableSkills = [];
    }
    return;
  }

  const taskQueues = getTaskQueuesForBusinessUnit(config.business_unit, config.ui_business_units);
  const skills = getSkillsForTaskQueues(taskQueues, manager.serviceConfiguration.taskrouter_skills);

  if (flex.WorkerSkills && 'defaultProps' in flex.WorkerSkills) {
    (flex.WorkerSkills.defaultProps as { availableSkills?: any[] }).availableSkills = skills;
  }
};
