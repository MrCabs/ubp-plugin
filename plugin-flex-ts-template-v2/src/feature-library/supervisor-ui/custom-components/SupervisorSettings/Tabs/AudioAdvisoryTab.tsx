import React, { useState, useEffect, useRef } from 'react';
import { Box } from '@twilio-paste/core/box';
import { Button } from '@twilio-paste/core/button';
import { Card } from '@twilio-paste/core/card';
import { Combobox } from '@twilio-paste/core/combobox';
import { Spinner } from '@twilio-paste/core/spinner';
import { Alert } from '@twilio-paste/core/alert';
import { Stack } from '@twilio-paste/core/stack';
import { Text } from '@twilio-paste/core/text';
import { Badge } from '@twilio-paste/core/badge';
import { HelpText } from '@twilio-paste/core/help-text';
import { Switch } from '@twilio-paste/core/switch';
import { Label } from '@twilio-paste/core/label';
import { TextArea } from '@twilio-paste/core/TextArea';
import { InputBox } from '@twilio-paste/core/input-box';
import { PlayIcon } from '@twilio-paste/icons/esm/PlayIcon';
import { PauseIcon } from '@twilio-paste/icons/esm/PauseIcon';
import { DeleteIcon } from '@twilio-paste/icons/esm/DeleteIcon';
import { DragIcon } from '@twilio-paste/icons/esm/DragIcon';
import { FilePond, registerPlugin } from 'react-filepond';
import type { FilePondFile, ActualFileObject, ProcessServerConfigFunction } from 'filepond';
import type { UseComboboxStateChange } from '@twilio-paste/combobox';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DroppableProvided,
  DraggableProvided,
  DropResult,
} from 'react-beautiful-dnd';
import FilePondPluginFileEncode from 'filepond-plugin-file-encode';
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type';

import 'filepond/dist/filepond.min.css';
import './custom-filepond.css';
import { useAdvisoryAudio } from '../../../flex-hooks/hooks/useAdvisoryAudio';
import { useFileUpload } from '../../../../../utils/hooks/communications/useFileUpload';

// Register FilePond plugins
registerPlugin(FilePondPluginFileEncode, FilePondPluginFileValidateType);

interface AudioItem {
  label: string;
  url: string;
  uploadedBy: string;
  lastModified: string;
  fileKey: string;
  type?: string;
}

interface AudioItemProps {
  item: AudioItem;
  onRemove: () => void;
  index: number;
}

interface ValidationErrors {
  message?: string;
  selectedAudios?: string;
}

const GroupedCombobox = ({
  audioList,
  onAddAudio,
  isLoading,
}: {
  audioList: AudioItem[];
  onAddAudio: (item: AudioItem | null) => void;
  isLoading: boolean;
}) => {
  const [inputItems, setInputItems] = useState<AudioItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<AudioItem | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [showClear, setShowClear] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const comboboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputItems(audioList);
  }, [audioList]);

  useEffect(() => {
    if (!isClearing) {
      setShowClear(Boolean(inputValue) || Boolean(selectedItem));
    }
  }, [inputValue, selectedItem, isClearing]);

  const handleInputChange = (newInputValue: string | undefined) => {
    if (isClearing) {
      return;
    }

    const value = newInputValue || '';
    setInputValue(value);

    if (value) {
      const filteredItems = audioList.filter((item) => item.label.toLowerCase().includes(value.toLowerCase()));
      setInputItems(filteredItems);
    } else {
      setInputItems(audioList);
    }
  };

  const clearCombobox = () => {
    setIsClearing(true);
    setSelectedItem(null);
    setInputValue('');
    setInputItems(audioList);
    setShowClear(false);

    const input = comboboxRef.current?.querySelector('input');
    if (input) {
      input.value = '';
    }

    setTimeout(() => {
      setIsClearing(false);
    }, 100);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    clearCombobox();
  };

  const handleSelectedItemChange = (changes: UseComboboxStateChange<AudioItem>) => {
    if (changes.selectedItem && !isClearing) {
      onAddAudio(changes.selectedItem);

      requestAnimationFrame(() => {
        clearCombobox();

        const input = comboboxRef.current?.querySelector('input');
        if (input) {
          input.value = '';
          const event = new Event('input', { bubbles: true });
          input.dispatchEvent(event);
        }
      });
    }
  };

  return (
    <Box marginBottom="space40" ref={comboboxRef}>
      <Box position="relative">
        <Combobox
          key={isClearing ? 'clearing' : 'normal'}
          autocomplete
          groupItemsBy="type"
          items={inputItems}
          labelText="Select Audio File"
          helpText="Choose an audio file from the list to add to your playlist"
          selectedItem={selectedItem}
          inputValue={isClearing ? '' : inputValue}
          onInputValueChange={({ inputValue }) => handleInputChange(inputValue)}
          itemToString={(item) => item?.label || ''}
          onSelectedItemChange={handleSelectedItemChange}
          optionTemplate={(item) => (
            <Stack orientation="horizontal" spacing="space30">
              <Text as="span">{item.label}</Text>
              <Badge as="span" variant="default">
                {new Date(item.lastModified).toLocaleDateString()}
              </Badge>
            </Stack>
          )}
          aria-label="Audio selection combobox"
          insertAfter={
            isLoading ? (
              <Box padding="space40" display="flex" justifyContent="center">
                <Spinner size="sizeIcon30" decorative={false} title="Loading audio files" />
              </Box>
            ) : undefined
          }
        />
        {showClear && !isClearing && (
          <Box position="absolute" right="space40" top="35%" cursor="pointer" onClick={handleClear}>
            ×
          </Box>
        )}
      </Box>
    </Box>
  );
};

const createProcessFn = (handleProcessFile: any): ProcessServerConfigFunction => {
  return (
    fieldName: string,
    file: ActualFileObject,
    metadata: any,
    load: (p: string | { [key: string]: any }) => void,
    error: (error: string) => void,
    progress: (isLengthComputable: boolean, loaded: number, total: number) => void,
    abort: () => void,
  ) => {
    try {
      return handleProcessFile(fieldName, file, metadata, load, error, progress, abort);
    } catch (err) {
      error((err as Error).message);
      return {
        abort: () => {
          abort();
        },
      };
    }
  };
};

const AudioItem = ({ item, onRemove, index }: AudioItemProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState<string>('');
  const [audio] = useState(new Audio(item.url));

  useEffect(() => {
    // Add duration loading
    const handleLoadedMetadata = () => {
      const totalSeconds = Math.floor(audio.duration);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      setDuration(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', () => setIsPlaying(false));

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', () => setIsPlaying(false));
      audio.pause();
    };
  }, [audio]);

  const togglePlay = () => {
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Draggable draggableId={item.fileKey} index={index}>
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
              <HelpText color="colorTextWeak">
                Uploaded by {item.uploadedBy} on {formatDate(item.lastModified)}
              </HelpText>
            </Stack>
            <Box marginLeft="auto" display="flex" alignItems="center">
              {duration && (
                <Text as="span" marginRight="space40" color="colorTextWeak">
                  {duration}
                </Text>
              )}
              <Button variant="destructive_icon" onClick={onRemove}>
                <DeleteIcon decorative={false} title="remove" />
              </Button>
            </Box>
          </Box>
        </Box>
      )}
    </Draggable>
  );
};

const AudioAdvisoryTab = () => {
  const apiKey = 'WpB7cNcIGk2lqfCXXCLBg1PMOyGxoGwP7i8jHOAt';
  const { audioList, isLoading, error: fetchError, fetchAdvisoryAudio } = useAdvisoryAudio(apiKey);
  const [selectedAudios, setSelectedAudios] = useState<AudioItem[]>([]);
  const [useAudioRecording, setUseAudioRecording] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const { handleProcessFile, fileUploadError, handleRemoveFile, setBase64 } = useFileUpload(
    audioList,
    fetchAdvisoryAudio,
  );

  const handleUpdateFiles = (fileItems: FilePondFile[]) => {
    setFiles(fileItems.map((fileItem) => fileItem.file as File));
  };

  const handleMessageChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(event.target.value);
    // Clear validation error when user starts typing
    if (event.target.value.trim()) {
      setValidationErrors((prev) => ({ ...prev, message: undefined }));
    }
  };

  useEffect(() => {
    fetchAdvisoryAudio();
  }, []);

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};
    let isValid = true;

    if (!useAudioRecording && !message.trim()) {
      errors.message = 'Announcement text is required';
      isValid = false;
    }

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

      // Add your save logic here
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Show success message or handle response
    } catch (err) {
      setSaveError('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddAudio = (selectedItem: AudioItem | null) => {
    if (selectedItem && !selectedAudios.find((audio) => audio.fileKey === selectedItem.fileKey)) {
      setSelectedAudios([...selectedAudios, selectedItem]);
      // Clear validation error when audio is added
      setValidationErrors((prev) => ({ ...prev, selectedAudios: undefined }));
    }
  };

  const handleRemoveAudio = (fileKey: string) => {
    setSelectedAudios(selectedAudios.filter((audio) => audio.fileKey !== fileKey));
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(selectedAudios);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setSelectedAudios(items);
  };

  if (fetchError) {
    return (
      <Alert variant="error">
        <Text as="span">Failed to load audio files: {fetchError}</Text>
      </Alert>
    );
  }

  const renderAudioRecording = () => {
    if (isLoading) {
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
            <Box>
              <FilePond
                files={files}
                allowMultiple={false}
                maxFiles={1}
                onupdatefiles={handleUpdateFiles}
                onremovefile={handleRemoveFile}
                name="files"
                instantUpload={true}
                allowProcess={false}
                allowRevert={false}
                forceRevert={false}
                labelIdle="Drag & Drop your audio file or Browse"
                labelFileProcessingError={fileUploadError || 'Error during upload'}
                allowFileEncode={true}
                credits={false}
                acceptedFileTypes={['audio/mpeg', 'audio/wav']}
                fileValidateTypeDetectType={async (source, type) =>
                  new Promise((resolve) => {
                    resolve(type);
                  })
                }
                onpreparefile={(item) => {
                  setBase64(item.getFileEncodeBase64String());
                }}
                server={{
                  process: createProcessFn(handleProcessFile),
                }}
              />
              <HelpText id="file-upload">
                Upload audio files (MP3 or WAV) by dragging them here or clicking to browse. Maximum file size: 5MB.
              </HelpText>
            </Box>

            <GroupedCombobox audioList={audioList} onAddAudio={handleAddAudio} isLoading={isLoading} />
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
              <HelpText id="drag-drop-help">
                Arrange the play order of your audio files by dragging them into position; they'll play top to bottom as
                listed. Use the play button to preview and ensure the correct order for your IVR flow.
              </HelpText>
            </Box>
          )}
          <Droppable droppableId="audio-list">
            {(provided: DroppableProvided) => (
              <Stack orientation="vertical" spacing="space30" ref={provided.innerRef} {...provided.droppableProps}>
                {selectedAudios.map((audio, index) => (
                  <AudioItem
                    key={audio.fileKey}
                    item={audio}
                    index={index}
                    onRemove={() => handleRemoveAudio(audio.fileKey)}
                  />
                ))}
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
        <Label htmlFor="advisory_message" required>
          Text-to-speech
        </Label>
        <InputBox element="" hasError={Boolean(validationErrors.message)}>
          <TextArea
            id="advisory_message"
            value={message}
            onChange={handleMessageChange}
            resize="vertical"
            placeholder="Enter your announcement"
            aria-label="Text-to-speech input"
            aria-invalid={Boolean(validationErrors.message)}
          />
        </InputBox>
        {validationErrors.message && (
          <Text as="span" color="colorTextError">
            {validationErrors.message}
          </Text>
        )}
        <HelpText id="advisory_help_text">
          Enter the text you wish to convert to speech in the field above. The text-to-speech feature enables you to
          create natural-sounding audio from any piece of text. This allows the system to generate spoken audio directly
          from the text you provide, rather than using a pre-recorded audio file.
        </HelpText>
      </Stack>
    </>
  );

  return (
    <Card>
      <Stack orientation="vertical" spacing="space60">
        {saveError && (
          <Alert variant="error">
            <Text as="span">{saveError}</Text>
          </Alert>
        )}

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

        <Box marginTop="space60">
          <Button variant="primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Stack orientation="horizontal" spacing="space30">
                <Spinner decorative={false} title="Saving changes" size="sizeIcon20" />
                <Text as="span">Saving Changes...</Text>
              </Stack>
            ) : (
              'Save Changes'
            )}
          </Button>
        </Box>
      </Stack>
    </Card>
  );
};

export default AudioAdvisoryTab;
