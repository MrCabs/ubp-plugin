import ApiService from '../../../utils/serverless/ApiService';
import { EncodedParams } from '../../../types/serverless';
import logger from '../../../utils/logger';
import { ApiError } from './ApiError';
import type { SupervisorUiServiceResponse, StoredAudio, AudioStorageResponse } from '../types/ServiceConfiguration';
import { getAudioKey, getAudioUrl } from '../config';

const MAX_ATTEMPTS = 10;
const MAX_RETRY_DELAY = 3000;
const RETRY_INTERVAL = 100;

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry<T>(
  url: string | { url: string; options: RequestInit; queryParams?: EncodedParams },
  options: RequestInit = {},
  attempts = 0,
): Promise<T> {
  try {
    let finalUrl: string;
    let finalOptions: RequestInit;

    if (typeof url === 'string') {
      finalUrl = url;
      finalOptions = options;
    } else {
      finalUrl = url.url;
      finalOptions = url.options;
      if (url.queryParams) {
        const params = new URLSearchParams();
        Object.entries(url.queryParams).forEach(([key, value]) => {
          if (value !== undefined) {
            params.append(key, value.toString());
          }
        });
        finalUrl += `?${params.toString()}`;
      }
    }

    const response = await fetch(finalUrl, finalOptions);
    const data = await response.json();

    if (!response.ok) {
      throw ApiError.create(data, response.status);
    }

    return data;
  } catch (error: any) {
    if (
      ((error instanceof TypeError &&
        (error.message === 'Failed to fetch' || error.message === 'NetworkError when attempting to fetch resource.')) ||
        error.status === 429) &&
      attempts < MAX_ATTEMPTS
    ) {
      const backoffDelay = Math.min(MAX_RETRY_DELAY, RETRY_INTERVAL * Math.pow(2, attempts));
      const jitterDelay = Math.floor(backoffDelay * Math.random());
      await delay(jitterDelay);
      return fetchWithRetry<T>(url, options, attempts + 1);
    }

    if (error instanceof ApiError) {
      throw error;
    }

    throw ApiError.create(error.message || 'Network Error');
  }
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

  listAudioFiles = async (
    prefix?: string,
    limit?: number,
    nextContinuationToken?: string,
    uploadedBy?: string,
  ): Promise<AudioStorageResponse> => {
    if (!getAudioKey()) throw new Error('getAudioKey() not configured');

    const encodedParams: EncodedParams = {
      ...(prefix && { prefix: encodeURIComponent(prefix) }),
      ...(limit && { limit: encodeURIComponent(limit.toString()) }),
      ...(nextContinuationToken && {
        nextContinuationToken: encodeURIComponent(nextContinuationToken),
      }),
      ...(uploadedBy && { uploadedBy: encodeURIComponent(uploadedBy) }),
    };

    return fetchWithRetry<AudioStorageResponse>({
      url: `https://${getAudioUrl()}/audio`,
      options: {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': getAudioKey(),
        },
      },
      queryParams: encodedParams,
    });
  };

  uploadAudioFile = async (
    file: File,
    directory: string,
    metadata: {
      uploadedBy: string;
      tags?: string;
      description?: string;
    },
  ): Promise<StoredAudio> => {
    if (!getAudioKey()) throw new Error('getAudioKey() not configured');

    const formData = new FormData();
    formData.append('files', file);
    formData.append('directory', directory);
    formData.append('uploadedBy', metadata.uploadedBy);
    if (metadata.tags) formData.append('tags', metadata.tags);
    if (metadata.description) formData.append('description', metadata.description);

    return fetchWithRetry<StoredAudio>({
      url: `https://${getAudioUrl()}/audio`,
      options: {
        method: 'POST',
        headers: {
          'x-api-key': getAudioKey(),
        },
        body: formData,
      },
    });
  };

  searchAudioFiles = async (
    term: string,
    directory: string,
    uploadedBy?: string,
    nextContinuationToken?: string,
    limit?: number,
  ): Promise<AudioStorageResponse> => {
    if (!getAudioKey()) throw new Error('getAudioKey() not configured');

    const encodedParams: EncodedParams = {
      term: encodeURIComponent(term),
      directory: encodeURIComponent(directory),
      ...(uploadedBy && { uploadedBy: encodeURIComponent(uploadedBy) }),
      ...(nextContinuationToken && {
        nextContinuationToken: encodeURIComponent(nextContinuationToken),
      }),
      ...(limit && { limit: encodeURIComponent(limit.toString()) }),
    };

    return fetchWithRetry<AudioStorageResponse>({
      url: `https://${getAudioUrl()}/audio/search`,
      options: {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': getAudioKey(),
        },
      },
      queryParams: encodedParams,
    });
  };

  getAudioFile = async (fileKey: string): Promise<StoredAudio> => {
    if (!getAudioKey()) throw new Error('getAudioKey() not configured');

    return fetchWithRetry<StoredAudio>({
      url: `https://${getAudioUrl()}/audio/${fileKey}`,
      options: {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': getAudioKey(),
        },
      },
    });
  };

  deleteAudioFile = async (fileKey: string): Promise<{ success: boolean; message: string }> => {
    if (!getAudioKey()) throw new Error('getAudioKey() not configured');

    return fetchWithRetry<{ success: boolean; message: string }>({
      url: `https://${getAudioUrl()}/audio/${encodeURIComponent(fileKey)}`,
      options: {
        method: 'DELETE',
        headers: {
          'x-api-key': getAudioKey(),
        },
      },
    });
  };

  getAudioStreamUrl = (fileKey: string): string => {
    if (!getAudioKey()) throw new Error('getAudioKey() not configured');
    return `https://${getAudioUrl()}/audio/stream/${encodeURIComponent(fileKey)}?x-api-key=${getAudioKey()}`;
  };
}

export default new SupervisorUiService();
