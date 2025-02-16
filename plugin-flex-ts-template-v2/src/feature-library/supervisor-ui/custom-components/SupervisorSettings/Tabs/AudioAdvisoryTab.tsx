import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Manager } from '@twilio/flex-ui';
import { Box } from '@twilio-paste/core/box';
import { Button } from '@twilio-paste/core/button';
import { Heading } from '@twilio-paste/core/heading';
import { Spinner } from '@twilio-paste/core/spinner';
import { Alert } from '@twilio-paste/core/alert';
import { Stack } from '@twilio-paste/core/stack';
import { Text } from '@twilio-paste/core/text';
import { HelpText } from '@twilio-paste/core/help-text';
import { Switch } from '@twilio-paste/core/switch';
import { Label } from '@twilio-paste/core/label';
import { TextArea } from '@twilio-paste/core/TextArea';
import { InputBox } from '@twilio-paste/core/input-box';
import { PlayIcon } from '@twilio-paste/icons/esm/PlayIcon';
import { PauseIcon } from '@twilio-paste/icons/esm/PauseIcon';
import { DragDropContext, Droppable, DroppableProvided, DropResult } from 'react-beautiful-dnd';

import { ConfigCard } from '../../../flex-hooks/components/ConfigCard';
import { useAdvisoryAudio } from '../../../flex-hooks/hooks/useAdvisoryAudio';
import { useFileUpload } from '../../../flex-hooks/hooks/useFileUpload';
import { useConfiguration } from '../../../flex-hooks/hooks/useConfiguration';
import { AudioCombobox } from '../../../flex-hooks/components/AudioCombobox';
import { PlayableAudioItem } from '../../../flex-hooks/components/AudioItem';
import { AudioFileUpload } from '../../../flex-hooks/components/AudioUploader';
import { SaveButton } from '../../../flex-hooks/components/SaveButton';
import { LastUpdatedInfo } from '../../../flex-hooks/components/LastUpdatedInfo';
import type { PlayableAudio } from '../../../types/ServiceConfiguration';

interface DraggableAudioItem extends PlayableAudio {
  instanceId: string;
  type?: string;
  fileKey: string;
}

interface ValidationErrors {
  message?: string;
  selectedAudios?: string;
}

interface AudioAdvisoryTabProps {
  toasterSuccessNotification: (message: string) => void;
}

interface AudioAdvisoryConfig {
  useAudioRecording: boolean;
  message?: string;
  selectedAudios: DraggableAudioItem[];
  lastUpdated?: string;
  updatedBy?: string;
}

const defaultConfig: AudioAdvisoryConfig = {
  useAudioRecording: true,
  message: '',
  selectedAudios: [],
};

const AudioAdvisoryTab = ({ toasterSuccessNotification }: AudioAdvisoryTabProps) => {
  const {
    audioList,
    isLoading: isLoadingAudio,
    error: fetchError,
    fetchAdvisoryAudio,
    triggerRefresh,
  } = useAdvisoryAudio();
  const {
    config,
    isLoading: isLoadingConfig,
    error: configError,
    saveConfig,
  } = useConfiguration<AudioAdvisoryConfig>({
    defaultConfig,
    featureName: 'ivr_advisory',
    shouldAppendConfig: false,
  });

  const [localConfig, setLocalConfig] = useState<AudioAdvisoryConfig>(defaultConfig);
  const [selectedAudios, setSelectedAudios] = useState<DraggableAudioItem[]>([]);
  const [useAudioRecording, setUseAudioRecording] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const { handleProcessFile, fileUploadError } = useFileUpload();
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const parentAudioRef = useRef<HTMLAudioElement>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const urlMapRef = useRef<Map<string, string>>(new Map());

  const [lastRefreshTime, setLastRefreshTime] = useState<number>(Date.now());
  const REFRESH_INTERVAL = 45 * 60 * 1000;

  useEffect(() => {
    if (config) {
      const newConfig = {
        ...config,
        selectedAudios: config.selectedAudios || [],
        message: config.message || '',
      };
      setLocalConfig(newConfig);
      setSelectedAudios(newConfig.selectedAudios);
      setUseAudioRecording(newConfig.useAudioRecording);
      setMessage(newConfig.message);

      if (isInitialLoad) {
        setIsInitialLoad(false);
      } else {
        setHasChanges(false);
      }
    }
  }, [config]);

  useEffect(() => {
    if (isInitialLoad) {
      return;
    }

    const compareArrays = (arr1: DraggableAudioItem[], arr2: DraggableAudioItem[]) => {
      if (arr1.length !== arr2.length) return true;

      return arr1.some((item, index) => {
        const item2 = arr2[index];
        return item.fileKey !== item2.fileKey || item.label !== item2.label || item.instanceId !== item2.instanceId;
      });
    };

    const hasAudioListChanged = compareArrays(selectedAudios, config.selectedAudios);
    const hasRecordingToggleChanged = useAudioRecording !== config.useAudioRecording;
    const hasMessageChanged = message.trim() !== (config.message || '').trim();

    const hasAnyChanges = hasAudioListChanged || hasRecordingToggleChanged || hasMessageChanged;
    setHasChanges(hasAnyChanges);
  }, [selectedAudios, useAudioRecording, message, config, isInitialLoad]);

  const handleRefreshUrls = async () => {
    await fetchAdvisoryAudio();
    setLastRefreshTime(Date.now());
  };

  useEffect(() => {
    const checkAndRefresh = async () => {
      const now = Date.now();
      if (now - lastRefreshTime >= REFRESH_INTERVAL) {
        await handleRefreshUrls();
      }
    };

    const intervalId = setInterval(checkAndRefresh, 60000); // Check every minute
    return () => clearInterval(intervalId);
  }, [lastRefreshTime]);

  useEffect(() => {
    const newUrlMap = new Map();
    audioList.forEach((audio) => {
      newUrlMap.set(audio.fileKey, audio.url);
    });
    urlMapRef.current = newUrlMap;

    // Update URLs in selectedAudios if they exist
    if (selectedAudios.length > 0) {
      setSelectedAudios((prevSelected) =>
        prevSelected.map((audio) => ({
          ...audio,
          url: newUrlMap.get(audio.fileKey) || audio.url,
        })),
      );
    }
  }, [audioList]);

  const handlePlayAll = async () => {
    if (isPlayingAll) {
      parentAudioRef.current?.pause();
      setIsPlayingAll(false);
    } else {
      if (selectedAudios.length === 0) return;
      setIsPlayingAll(true);
      await playTrack(0);
    }
  };

  const playTrack = useCallback(
    async (index: number) => {
      if (index >= selectedAudios.length) {
        setIsPlayingAll(false);
        setCurrentTrackIndex(0);
        return;
      }

      const audioItem = selectedAudios[index];
      const latestUrl = urlMapRef.current?.get(audioItem.fileKey) || audioItem.url;

      if (parentAudioRef.current) {
        parentAudioRef.current.src = latestUrl;
        try {
          setCurrentTrackIndex(index);
          await parentAudioRef.current.play();
        } catch (error) {
          console.error('Error playing audio:', error);

          try {
            await handleRefreshUrls();
            const freshUrl = urlMapRef.current?.get(audioItem.fileKey);
            if (freshUrl && parentAudioRef.current) {
              parentAudioRef.current.src = freshUrl;
              setCurrentTrackIndex(index);
              await parentAudioRef.current.play();
              return;
            }
          } catch (refreshError) {
            console.error('Error refreshing audio URLs:', refreshError);
          }

          setIsPlayingAll(false);
          setCurrentTrackIndex(0);
          toasterSuccessNotification('Unable to play audio. Please refresh the page and try again.');
        }
      }
    },
    [selectedAudios, toasterSuccessNotification],
  );

  const handleMessageChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(event.target.value);
    // Clear validation error when user starts typing
    if (event.target.value.trim()) {
      setValidationErrors((prev) => ({ ...prev, message: undefined }));
    }
  };

  useEffect(() => {
    const audioElement = parentAudioRef.current;
    if (!audioElement) return undefined;

    const handleEnded = async () => {
      if (isPlayingAll) {
        const nextIndex = currentTrackIndex + 1;
        if (nextIndex < selectedAudios.length) {
          try {
            await playTrack(nextIndex);
          } catch (error) {
            console.error('Error playing next track:', error);
            setIsPlayingAll(false);
            setCurrentTrackIndex(0);
          }
        } else {
          setIsPlayingAll(false);
          setCurrentTrackIndex(0);
        }
      }
    };

    const handleError = () => {
      console.error('Audio playback error');
      setIsPlayingAll(false);
      setCurrentTrackIndex(0);
    };

    const handlePause = () => {
      // Only update playing state if it wasn't the end of a track
      if (!audioElement.ended) {
        setIsPlayingAll(false);
      }
    };

    audioElement.addEventListener('ended', handleEnded);
    audioElement.addEventListener('error', handleError);
    audioElement.addEventListener('pause', handlePause);

    return () => {
      audioElement.removeEventListener('ended', handleEnded);
      audioElement.removeEventListener('error', handleError);
      audioElement.removeEventListener('pause', handlePause);
      return undefined;
    };
  }, [selectedAudios.length, isPlayingAll, currentTrackIndex, playTrack]);

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};
    let isValid = true;

    if (useAudioRecording && selectedAudios.length === 0) {
      errors.selectedAudios = 'At least one audio file must be selected';
      isValid = false;
    }

    setValidationErrors(errors);
    return isValid;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsSaving(true);
      setSaveError('');

      const updatedConfig: AudioAdvisoryConfig = {
        useAudioRecording,
        message,
        selectedAudios: selectedAudios.map((audio) => ({
          ...audio,
          fileKey: audio.fileKey,
          label: audio.label,
          type: audio.type,
          lastModified: audio.lastModified,
          uploadedBy: audio.uploadedBy,
          instanceId: audio.instanceId,
        })),
        lastUpdated: new Date().toISOString(),
        updatedBy: Manager.getInstance().user?.identity || '',
      };

      await saveConfig(updatedConfig);
      setHasChanges(false);
      toasterSuccessNotification('Audio advisory settings updated successfully');
    } catch (err) {
      setSaveError('Failed to save audio advisory settings. Please try again.');
      console.error('Error saving audio advisory settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const generateInstanceId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleAddAudio = (selectedItem: PlayableAudio | null) => {
    if (selectedItem) {
      const newAudioItem: DraggableAudioItem = {
        ...selectedItem,
        instanceId: generateInstanceId(),
        fileKey: selectedItem.fileKey,
      };
      setSelectedAudios((prev) => [...prev, newAudioItem]);
      setValidationErrors((prev) => ({ ...prev, selectedAudios: undefined }));
    }
  };

  const handleRemoveAudio = (instanceId: string) => {
    setSelectedAudios(selectedAudios.filter((audio) => audio.instanceId !== instanceId));
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(selectedAudios);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setSelectedAudios(items);
  };

  if (fetchError || configError) {
    return (
      <Alert variant="error">
        <Text as="span">Failed to load audio files: {fetchError}</Text>
      </Alert>
    );
  }

  const renderAudioRecording = () => {
    if (isLoadingAudio || isLoadingConfig) {
      return (
        <Box display="flex" justifyContent="center">
          <Spinner size="sizeIcon70" decorative={false} title="Loading audio files" />
        </Box>
      );
    }

    return (
      <>
        <Box marginBottom="space60">
          <Stack orientation="vertical" spacing="space60">
            <AudioFileUpload
              files={files}
              setFiles={setFiles}
              fileUploadError={fileUploadError}
              handleProcessFile={handleProcessFile}
              triggerRefresh={triggerRefresh}
            />

            <AudioCombobox
              audioList={audioList}
              onAddAudio={handleAddAudio}
              isLoading={isLoadingAudio}
              key={audioList.length}
            />
          </Stack>
        </Box>

        <DragDropContext onDragEnd={onDragEnd}>
          {validationErrors.selectedAudios && (
            <Text as="span" color="colorTextError">
              {validationErrors.selectedAudios}
            </Text>
          )}

          {selectedAudios.length > 0 && (
            <Box marginBottom="space40">
              <Heading as="h2" variant="heading30">
                Audio Playback
              </Heading>
              <Box marginBottom="space40">
                <HelpText id="drag-drop-help">
                  Arrange the play order of your audio files by dragging them into position. You can add the same audio
                  file multiple times if needed. They'll play top to bottom as listed.
                </HelpText>
              </Box>

              <audio ref={parentAudioRef} style={{ display: 'none' }} />
              <Box marginBottom="space40">
                <Button
                  variant="secondary"
                  onClick={handlePlayAll}
                  disabled={selectedAudios.length === 0}
                  aria-label={isPlayingAll ? 'Pause all audio' : 'Play all audio'}
                >
                  <Stack orientation="horizontal" spacing="space30">
                    {isPlayingAll ? <PauseIcon decorative /> : <PlayIcon decorative />}
                    <Text as="span">{isPlayingAll ? 'Pause All' : 'Play All'}</Text>
                  </Stack>
                </Button>
              </Box>
            </Box>
          )}

          <Droppable droppableId="audio-list">
            {(provided: DroppableProvided) => (
              <Stack orientation="vertical" spacing="space30" ref={provided.innerRef} {...provided.droppableProps}>
                {selectedAudios.map((audio, index) => renderAudioItem(audio, index))}
                {provided.placeholder}
                {provided.placeholder}
              </Stack>
            )}
          </Droppable>
        </DragDropContext>
      </>
    );
  };

  const renderTextToSpeech = () => (
    <>
      <Stack orientation="vertical" spacing="space40">
        <Label htmlFor="advisory_message">Text-to-speech</Label>
        <InputBox element="">
          <TextArea
            id="advisory_message"
            value={message}
            onChange={handleMessageChange}
            resize="vertical"
            placeholder="Enter your announcement (leave empty to disable text-to-speech)"
            aria-label="Text-to-speech input"
          />
        </InputBox>
        <HelpText id="advisory_help_text">
          Enter the text you wish to convert to speech in the field above, or leave it empty to disable text-to-speech.
          When text is provided, the text-to-speech feature will convert it into natural-sounding audio. If left empty,
          no text-to-speech audio will be played in the IVR.
        </HelpText>
      </Stack>
    </>
  );

  const renderAudioItem = (audio: DraggableAudioItem, index: number) => (
    <PlayableAudioItem
      key={audio.instanceId}
      item={audio}
      index={index}
      onRemove={handleRemoveAudio}
      urlMapRef={urlMapRef}
      onRefreshUrls={handleRefreshUrls}
      onPlaybackError={toasterSuccessNotification}
    />
  );

  const handleCancel = () => {
    setSelectedAudios(localConfig.selectedAudios);
    setUseAudioRecording(localConfig.useAudioRecording);
    setMessage(localConfig.message || '');
    setHasChanges(false);
    setValidationErrors({});
  };

  return (
    <ConfigCard error={saveError || fetchError || configError}>
      {saveError && (
        <Alert variant="error">
          <Text as="span">{saveError}</Text>
        </Alert>
      )}

      <Heading as="h2" variant="heading30">
        Announcement Settings
      </Heading>
      <Stack orientation="vertical" spacing="space60">
        <Box>
          <Switch
            checked={useAudioRecording}
            onChange={(e) => setUseAudioRecording(e.target.checked)}
            id="use-audio-recording"
          >
            Use Audio Recording
          </Switch>
          <HelpText id="audio-recording-help">Toggle to enable the selection of pre-recorded audio files.</HelpText>
        </Box>

        {useAudioRecording ? renderAudioRecording() : renderTextToSpeech()}

        {/* Action Buttons */}
        {hasChanges && (
          <Box marginTop="space60">
            <Stack orientation="horizontal" spacing="space40">
              <SaveButton isLoading={isSaving} onClick={handleSave} disabled={isLoadingAudio || isLoadingConfig} />
              <Button variant="secondary" onClick={handleCancel} disabled={isLoadingAudio || isLoadingConfig}>
                Cancel
              </Button>
            </Stack>
          </Box>
        )}

        {/* Last Updated Information */}
        {localConfig.lastUpdated && (
          <LastUpdatedInfo lastUpdated={localConfig.lastUpdated} updatedBy={localConfig.updatedBy || ''} />
        )}
      </Stack>
    </ConfigCard>
  );
};

export default AudioAdvisoryTab;
