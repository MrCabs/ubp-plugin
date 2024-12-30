import ApiService from '../../../utils/serverless/ApiService';
import { EncodedParams } from '../../../types/serverless';
import logger from '../../../utils/logger';

export interface SupervisorUiServiceResponse {
  configuration: any;
}

class SupervisorUiService extends ApiService {
  fetchUiAttributes = async (): Promise<SupervisorUiServiceResponse> => {
    const encodedParams: EncodedParams = {
      Token: encodeURIComponent(this.manager.user.token),
    };

    try {
      return await this.fetchJsonWithReject<SupervisorUiServiceResponse>(
        `${this.serverlessProtocol}://${this.serverlessDomain}/features/admin-ui/flex/fetch-config`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: this.buildBody(encodedParams),
        },
      );
    } catch (error: any) {
      logger.error('[supervisor-ui] Error fetching agent automation configuration\r\n', error);
      throw error;
    }
  };

  updateUiAttributes = async (
    attributesUpdate: string,
    mergeFeature: boolean,
  ): Promise<SupervisorUiServiceResponse> => {
    const encodedParams: EncodedParams = {
      Token: encodeURIComponent(this.manager.user.token),
      attributesUpdate: encodeURIComponent(attributesUpdate),
      mergeFeature: encodeURIComponent(mergeFeature),
    };

    try {
      return await this.fetchJsonWithReject<SupervisorUiServiceResponse>(
        `${this.serverlessProtocol}://${this.serverlessDomain}/features/admin-ui/flex/update-config`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: this.buildBody(encodedParams),
        },
      );
    } catch (error: any) {
      logger.error('[supervisor-ui] Error updating agent automation configuration\r\n', error);
      throw error;
    }
  };
}

export default new SupervisorUiService();
