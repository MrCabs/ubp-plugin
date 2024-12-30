import { useState } from 'react';
import { Manager } from '@twilio/flex-ui';

interface AudioItem {
  label: string;
  url: string;
}

export const useFileUpload = (audioList: AudioItem[], fetchData: () => void) => {
  const [files, setFiles] = useState<any[]>([]);
  const [base64, setBase64] = useState<string>('');
  const [fileUploadError, setFileUploadError] = useState<string>('');

  const handleRemoveFile = () => {
    setFiles([]);
    setBase64('');
  };

  const isValidFileName = (fileName: string): boolean => {
    const validFileNameRegex = /^[a-zA-Z0-9_.-]+$/;
    return validFileNameRegex.test(fileName);
  };

  const checkBuildStatus = async (
    buildId: string,
    fileName: string,
    retryInterval: number = 10000,
    maxAttempts: number = 30,
  ): Promise<any> => {
    let attempts = 0;

    const attemptCheck = async (): Promise<any> => {
      attempts += 1;
      try {
        const manager = Manager.getInstance();
        const token = manager.user.token;

        const response = await fetch(
          `${process.env.FLEX_APP_TWILIO_SERVERLESS_DOMAIN}/custom-advisory/check-build-status`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ buildId, fileName }),
          },
        );

        const data = await response.json();
        if (data.status === 'completed') {
          return initiateDeployment(buildId, fileName);
        }

        if (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, retryInterval));
          return attemptCheck();
        }

        throw new Error('Max build status check attempts reached.');
      } catch (error) {
        console.error('Error checking build status:', error);
        if (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, retryInterval));
          return attemptCheck();
        }
        throw error;
      }
    };

    return attemptCheck();
  };

  const initiateDeployment = async (buildId: string, fileName: string): Promise<any> => {
    const manager = Manager.getInstance();
    const token = manager.user.token;

    const response = await fetch(`${process.env.FLEX_APP_TWILIO_SERVERLESS_DOMAIN}/custom-advisory/asset-deploy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ buildId, fileName }),
    });

    const deployData = await response.json();
    if (deployData.error) {
      throw new Error(deployData.error);
    }
    return deployData;
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
    const sanitizedFileName = file.name.replace(/\s+/g, '_');
    const abortObj = { abort: () => abort() };

    if (file.size > 5000000) {
      // 5 MB in bytes
      setFileUploadError('File size should be less than 5 MB');
      error('Error');
      return abortObj;
    }

    if (!isValidFileName(sanitizedFileName)) {
      setFileUploadError('Invalid file name');
      error('Error');
      return abortObj;
    }

    const fileExists = audioList.some((item) => item.label === sanitizedFileName);
    if (fileExists) {
      setFileUploadError('File name already exists');
      error('Error');
      return abortObj;
    }

    try {
      const manager = Manager.getInstance();
      const token = manager.user.token;

      // Create asset
      const createResponse = await fetch(
        `${process.env.FLEX_APP_TWILIO_SERVERLESS_DOMAIN}/custom-advisory/asset-create`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ fileName: sanitizedFileName }),
        },
      );
      const createData = await createResponse.json();
      if (createData.error) throw new Error(createData.error);

      // Upload asset
      const uploadResponse = await fetch(
        `${process.env.FLEX_APP_TWILIO_SERVERLESS_DOMAIN}/custom-advisory/asset-upload`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            assetSid: createData.assetSid,
            fileContentBase64: base64,
            fileName: sanitizedFileName,
          }),
        },
      );
      const uploadData = await uploadResponse.json();
      if (uploadData.error) throw new Error(uploadData.error);

      // Build asset
      const buildResponse = await fetch(
        `${process.env.FLEX_APP_TWILIO_SERVERLESS_DOMAIN}/custom-advisory/asset-build`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            assetVersionSid: uploadData.assetVersionSid,
            fileName: uploadData.fileName,
          }),
        },
      );
      const buildData = await buildResponse.json();
      if (buildData.error) throw new Error(buildData.error);

      const deployData = await checkBuildStatus(buildData.buildSid, buildData.fileName);
      if (deployData.error) throw new Error(deployData.error);

      load(deployData.url);
      setTimeout(() => {
        handleRemoveFile();
      }, 5000);

      await fetchData();
      return abortObj;
    } catch (err) {
      error(err instanceof Error ? err.message : 'Upload failed');
      return abortObj;
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
