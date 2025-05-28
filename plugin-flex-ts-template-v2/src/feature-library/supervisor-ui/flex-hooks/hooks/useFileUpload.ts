import { useState } from 'react';
import { Manager } from '@twilio/flex-ui';

import supervisorUiService from '../../utils/SupervisorUiService';
import { ApiError } from '../../utils/ApiError';
import { getAssetFolderName } from '../../config';

export const useFileUpload = () => {
  const manager = Manager.getInstance();

  const workerAttributes = manager.workerClient?.attributes || {};
  const uploaderName = workerAttributes.full_name || workerAttributes.email || 'Unknown User';

  const [files, setFiles] = useState<any[]>([]);
  const [base64, setBase64] = useState<string>('');
  const [fileUploadError, setFileUploadError] = useState<string>('');

  const handleRemoveFile = () => {
    setFileUploadError('');
  };

  const isValidFileName = (fileName: string): boolean => {
    const validFileNameRegex = /^[a-zA-Z0-9_.-]+$/;
    return validFileNameRegex.test(fileName);
  };

  const handleProcessFile = async (
    fieldName: string,
    file: File,
    metadata: any,
    load: (url: string) => void,
    error: (message: string) => void,
    progress: (percentage: number) => void,
    abort: () => void,
  ): Promise<{ abort: () => void }> => {
    let intervalId: number | undefined;

    try {
      // Progress simulation
      intervalId = window.setInterval(() => {
        progress(50);
      }, 500) as unknown as number;

      const result = await supervisorUiService.uploadAudioFile(file, getAssetFolderName(), {
        uploadedBy: uploaderName,
        tags: getAssetFolderName(),
        description: 'Advisory audio file',
      });

      if (intervalId) {
        window.clearInterval(intervalId);
      }
      progress(100);

      if (!result.signedUrl) throw new Error('No signed URL returned');

      load(result.signedUrl);

      return {
        abort: () => {
          if (intervalId) {
            window.clearInterval(intervalId);
          }
          abort();
        },
      };
    } catch (err) {
      if (intervalId) {
        window.clearInterval(intervalId);
      }

      let errorMessage: string;

      if (err instanceof ApiError) {
        // Get the error message from ApiError
        errorMessage = err.error || err.message;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null) {
        const errorObj = err as any;
        errorMessage = errorObj.error || errorObj.message || 'Upload failed';
      } else {
        errorMessage = 'Upload failed';
      }

      error(errorMessage);
      setFileUploadError(errorMessage);

      return {
        abort: () => {
          if (intervalId) {
            window.clearInterval(intervalId);
          }
          abort();
        },
      };
    }
  };

  return {
    files,
    setFiles,
    base64,
    setBase64,
    fileUploadError,
    setFileUploadError,
    handleRemoveFile,
    isValidFileName,
    handleProcessFile,
  };
};
