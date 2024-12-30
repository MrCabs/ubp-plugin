import { useState } from 'react';

interface AudioItem {
  label: string;
  url: string;
  fileKey: string;
  originalName: string;
  uploadedBy: string;
  lastModified: string;
}

interface AudioFileResponse {
  originalName: string;
  signedUrl: string;
  fileKey: string;
  uploadedBy: string;
  lastModified: string;
}

const mockAudioFiles = [
  {
    originalName: 'morning-advisory-2024-03-25.mp3',
    signedUrl: 'https://virtual-agent-1393.twil.io/m1_2.mp3',
    fileKey: 'advisory/morning-advisory-2024-03-25.mp3',
    uploadedBy: 'john.doe@example.com',
    lastModified: '2024-03-25T08:30:00Z',
  },
  {
    originalName: 'market-update-2024-03-24.mp3',
    signedUrl: 'https://virtual-agent-1393.twil.io/m1_5.mp3',
    fileKey: 'advisory/market-update-2024-03-24.mp3',
    uploadedBy: 'jane.smith@example.com',
    lastModified: '2024-03-24T16:45:00Z',
  },
  {
    originalName: 'weekly-roundup-2024-03-23.mp3',
    signedUrl: 'https://virtual-agent-1393.twil.io/m1_1.mp3',
    fileKey: 'advisory/weekly-roundup-2024-03-23.mp3',
    uploadedBy: 'alex.brown@example.com',
    lastModified: '2024-03-23T17:00:00Z',
  },
];

export const useAdvisoryAudio = (apiKey: string) => {
  const [audioList, setAudioList] = useState<AudioItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAdvisoryAudio = async () => {
    setIsLoading(true);
    setError(null);
    try {
      //   const response = await fetch(
      //     'https://oj0b2c3ii3.execute-api.ap-southeast-1.amazonaws.com/Stage/audio?prefix=advisory',
      //     {
      //       headers: {
      //         method: 'GET',
      //         'Content-Type': 'application/json',
      //         'x-api-key': apiKey,
      //       },
      //     },
      //   );

      //   if (!response.ok) {
      //     throw new Error('Failed to fetch advisory audio files');
      //   }

      //   const data = await response.json();

      // Transform the response to match the expected AudioItem format
      //   const formattedAudioList: AudioItem[] = data.files.map((file: AudioFileResponse) => ({
      const formattedAudioList: AudioItem[] = mockAudioFiles.map((file: AudioFileResponse) => ({
        label: file.originalName,
        url: file.signedUrl,
        fileKey: file.fileKey,
        originalName: file.originalName,
        uploadedBy: file.uploadedBy,
        lastModified: file.lastModified,
      }));

      setAudioList(formattedAudioList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching advisory audio files:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    audioList,
    isLoading,
    error,
    fetchAdvisoryAudio,
  };
};
