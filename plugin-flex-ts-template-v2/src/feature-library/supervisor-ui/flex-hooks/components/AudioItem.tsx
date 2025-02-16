import React, { useState, useEffect, useRef } from 'react';
import { Stack } from '@twilio-paste/core/stack';
import { Box } from '@twilio-paste/core/box';
import { Button } from '@twilio-paste/core/button';
import { Text } from '@twilio-paste/core/text';
import { Badge } from '@twilio-paste/core/badge';
import { HelpText } from '@twilio-paste/core/help-text';
import { PlayIcon } from '@twilio-paste/icons/esm/PlayIcon';
import { PauseIcon } from '@twilio-paste/icons/esm/PauseIcon';
import { DeleteIcon } from '@twilio-paste/icons/esm/DeleteIcon';
import { DragIcon } from '@twilio-paste/icons/esm/DragIcon';
import { Draggable, DraggableProvided } from 'react-beautiful-dnd';

interface PlayableAudioItem {
  label: string;
  url: string;
  uploadedBy: string;
  lastModified: string;
  fileKey: string;
  type?: string;
  instanceId: string;
}

interface PlayableAudioProps {
  item: PlayableAudioItem;
  index: number;
  onRemove: (instance_id: string) => void;
  urlMapRef: React.RefObject<Map<string, string>>;
  onRefreshUrls: () => Promise<void>;
  onPlaybackError: (message: string) => void;
}

export const PlayableAudioItem = ({
  item,
  index,
  onRemove,
  urlMapRef,
  onRefreshUrls,
  onPlaybackError,
}: PlayableAudioProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState<string>('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const latestUrl = urlMapRef.current?.get(item.fileKey) || item.url;
    const audio = new Audio(latestUrl);
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      const totalSeconds = Math.floor(audio.duration);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      setDuration(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
      audioRef.current = null;
    };
  }, [item.fileKey, item.url]);

  const handlePlayError = async () => {
    try {
      await onRefreshUrls();
      const freshUrl = urlMapRef.current?.get(item.fileKey);
      if (freshUrl && audioRef.current) {
        audioRef.current.src = freshUrl;
        await audioRef.current.play();
        setIsPlaying(true);
        return;
      }
    } catch (error) {
      console.error('Error refreshing audio URL:', error);
      onPlaybackError('Unable to play audio. Please refresh the page and try again.');
    }
    setIsPlaying(false);
  };

  const togglePlay = async () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      document.querySelectorAll('audio').forEach((audio) => audio.pause());
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (error) {
        console.error('Error playing audio:', error);
        await handlePlayError();
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Draggable draggableId={item.instanceId} index={index}>
      {(provided: DraggableProvided) => (
        <Box
          ref={provided.innerRef}
          {...provided.draggableProps}
          borderRadius="borderRadius20"
          borderWidth="borderWidth10"
          borderStyle="solid"
          borderColor="colorBorderWeaker"
          padding="space40"
          marginBottom="space30"
        >
          <Box display="flex" alignItems="center" width="100%">
            <Box {...provided.dragHandleProps} marginRight="space40">
              <DragIcon decorative />
            </Box>
            <Box marginRight="space40">
              <Button variant="secondary" size="circle" onClick={togglePlay}>
                {isPlaying ? <PauseIcon decorative /> : <PlayIcon decorative />}
              </Button>
            </Box>
            <Stack orientation="vertical" spacing="space20">
              <Text as="span" fontWeight="fontWeightMedium">
                {item.label}
              </Text>
              <Stack orientation="horizontal" spacing="space20">
                <HelpText color="colorTextWeak">Uploaded by {item.uploadedBy}</HelpText>
                <HelpText color="colorTextWeak">{formatDate(item.lastModified)}</HelpText>
                {item.type && (
                  <Badge as="span" variant="default">
                    {item.type}
                  </Badge>
                )}
              </Stack>
            </Stack>
            <Box marginLeft="auto" display="flex" alignItems="center">
              {duration && (
                <Text as="span" marginRight="space40" color="colorTextWeaker">
                  {duration}
                </Text>
              )}
              <Button
                variant="destructive_icon"
                onClick={() => onRemove(item.instanceId)}
                aria-label={`Remove ${item.label}`}
              >
                <DeleteIcon decorative={false} title="Remove audio" />
              </Button>
            </Box>
          </Box>
        </Box>
      )}
    </Draggable>
  );
};
