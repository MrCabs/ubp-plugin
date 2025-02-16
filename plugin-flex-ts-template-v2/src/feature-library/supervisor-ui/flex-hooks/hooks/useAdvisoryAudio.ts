import { useState, useEffect } from 'react';

import SupervisorUiService from '../../utils/SupervisorUiService';
import type { StoredAudio, PlayableAudio, AudioMetadata } from '../../types/ServiceConfiguration';
import { getAudioKey, getAudioUrl, getAssetFolderName } from '../../config';

export const useAdvisoryAudio = () => {
  const [audioList, setAudioList] = useState<PlayableAudio[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const formatAudioFile = (file: StoredAudio): PlayableAudio => ({
    label: file.originalName,
    url: file.signedUrl,
    fileKey: file.fileKey,
    originalName: file.originalName,
    uploadedBy: file.uploadedBy,
    lastModified: file.lastModified.toString(),
  });

  const fetchAdvisoryAudio = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await SupervisorUiService.listAudioFiles(
        getAssetFolderName(), // prefix/directory
      );

      const formattedAudioList = result.files.map(formatAudioFile);
      setAudioList(formattedAudioList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching advisory audio files:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Add automatic refresh capability
  const triggerRefresh = () => setRefreshTrigger((prev) => prev + 1);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchData = async () => {
      try {
        const response = await fetch(`${getAudioUrl()}/audio?prefix=${getAssetFolderName()}&cache=${Date.now()}`, {
          signal: controller.signal,
          headers: {
            'x-api-key': getAudioKey(),
          },
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        if (isMounted) {
          setAudioList(
            data.files.map((file: AudioMetadata) => ({
              label: file.originalName,
              url: file.signedUrl,
              fileKey: file.fileKey,
              uploadedBy: file.uploadedBy,
              lastModified: file.lastModified,
            })),
          );
        }
      } catch (err) {
        if (isMounted && !controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'An error occurred');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchData();
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [getAudioKey(), refreshTrigger]);

  return {
    audioList,
    isLoading,
    error,
    fetchAdvisoryAudio,
    triggerRefresh, // Add this new function to trigger manual refreshes
  };
};
