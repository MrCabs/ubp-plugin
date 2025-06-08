import TaskRouterService from '../../../utils/serverless/TaskRouter/TaskRouterService';
import AuditLogService from '../../utils/AuditLogService';
import * as Flex from '@twilio/flex-ui';
import { FlexActionEvent, FlexAction } from '../../../types/feature-loader';

export const actionEvent = FlexActionEvent.replace;
export const actionName = FlexAction.UpdateWorkerAttributes as any;

export const actionHook = function logWorkerSkillChange(flex: typeof Flex, manager: Flex.Manager) {
  const original = TaskRouterService.updateWorkerAttributes.bind(TaskRouterService);
  TaskRouterService.updateWorkerAttributes = async (workerSid: string, attributesUpdate: string) => {
    const adminSid = manager.user?.sid || 'unknown';
    const previous = manager.workerClient?.workers?.get(workerSid)?.attributes || {};
    const result = await original(workerSid, attributesUpdate);
    try {
      await AuditLogService.logSkillChange(
        workerSid,
        adminSid,
        'update_attributes',
        JSON.stringify(previous),
        attributesUpdate,
      );
    } catch (e) {
      console.error('audit-log failed', e);
    }
    return result;
  };
};
