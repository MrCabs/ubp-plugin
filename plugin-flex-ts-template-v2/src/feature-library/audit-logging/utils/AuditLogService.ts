import ApiService from '../../../utils/serverless/ApiService';
import { EncodedParams } from '../../../types/serverless';

export interface LogResponse { success: boolean; }

class AuditLogService extends ApiService {
  async logSkillChange(workerSid: string, adminSid: string, changeType: string, previousValue: string, newValue: string): Promise<LogResponse> {
    const encodedParams: EncodedParams = {
      workerSid: encodeURIComponent(workerSid),
      adminSid: encodeURIComponent(adminSid),
      changeType: encodeURIComponent(changeType),
      previousValue: encodeURIComponent(previousValue),
      newValue: encodeURIComponent(newValue),
      Token: encodeURIComponent(this.manager.user.token),
    };
    return this.fetchJsonWithReject<LogResponse>(
      `${this.serverlessProtocol}://${this.serverlessDomain}/features/audit-log/log-skill-change`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: this.buildBody(encodedParams),
      },
    );
  }
}

export default new AuditLogService();
