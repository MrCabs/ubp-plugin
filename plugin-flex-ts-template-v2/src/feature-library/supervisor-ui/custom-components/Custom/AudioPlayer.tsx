import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Stack } from '@twilio-paste/core/stack';
import { Text } from '@twilio-paste/core/text';
import { Button } from '@twilio-paste/core/button';
import { PlayIcon } from '@twilio-paste/icons/esm/PlayIcon';
import { PauseIcon } from '@twilio-paste/icons/esm/PauseIcon';

import SupervisorUiService from '../../utils/SupervisorUiService';

interface AudioItem {
  fileKey: string;
  instanceId: string;
  label: string;
  lastModified: string;
  originalName: string;
  uploadedBy: string;
  url?: string;
}

interface AudioPlayerProps {
  audioItem: AudioItem;
  onError?: (error: Error) => void;
}

const REFRESH_THRESHOLD = 300000; // 5 minutes before expiry
const URL_EXPIRY = 3600000; // 1 hour in milliseconds

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioItem, onError }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [lastUrlRefresh, setLastUrlRefresh] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const refreshUrl = useCallback(async () => {
    try {
      const streamUrl = SupervisorUiService.getAudioStreamUrl(audioItem.fileKey);
      setCurrentUrl(streamUrl);
      setLastUrlRefresh(Date.now());

      // Schedule next refresh 5 minutes before expiry
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      refreshTimeoutRef.current = setTimeout(() => {
        if (isPlaying) {
          refreshUrl();
        }
      }, URL_EXPIRY - REFRESH_THRESHOLD);
    } catch (error) {
      onError?.(error as Error);
      setIsPlaying(false);
    }
  }, [audioItem.fileKey, isPlaying, onError]);

  const handlePlay = useCallback(async () => {
    try {
      // Check if URL needs refresh
      const urlAge = Date.now() - lastUrlRefresh;
      if (!currentUrl || urlAge > URL_EXPIRY - REFRESH_THRESHOLD) {
        await refreshUrl();
      }

      if (audioRef.current) {
        audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      onError?.(error as Error);
    }
  }, [currentUrl, lastUrlRefresh, refreshUrl, onError]);

  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    // Initialize audio element with fresh URL
    refreshUrl();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [refreshUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const handleEnded = () => {
      setIsPlaying(false);
    };

    const handleError = (e: Event) => {
      console.error('Audio playback error:', e);
      setIsPlaying(false);
      onError?.(new Error('Audio playback failed'));
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [onError]);

  return (
    <Stack orientation="horizontal" spacing="space30">
      <audio
        ref={audioRef}
        src={currentUrl || undefined}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      <Button variant="secondary" size="circle" onClick={isPlaying ? handlePause : handlePlay}>
        {isPlaying ? <PauseIcon decorative /> : <PlayIcon decorative />}
      </Button>
      <Text as="span">{audioItem.label}</Text>
    </Stack>
  );
};

export default AudioPlayer;
