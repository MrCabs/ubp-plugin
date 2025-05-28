import React, { useEffect, useRef, useState } from 'react';
import { Box } from '@twilio-paste/core/box';
import { Combobox } from '@twilio-paste/core/combobox';
import { Spinner } from '@twilio-paste/core/spinner';
import { Stack } from '@twilio-paste/core/stack';
import { Text } from '@twilio-paste/core/text';
import { Badge } from '@twilio-paste/core/badge';
import type { UseComboboxStateChange } from '@twilio-paste/combobox';

import { PlayableAudio } from '../../types/ServiceConfiguration';

interface AudioComboboxProps {
  audioList: PlayableAudio[];
  onAddAudio: (item: PlayableAudio | null) => void;
  isLoading: boolean;
}

export const AudioCombobox = ({ audioList, onAddAudio, isLoading }: AudioComboboxProps) => {
  const [inputItems, setInputItems] = useState<PlayableAudio[]>([]);
  const [selectedItem, setSelectedItem] = useState<PlayableAudio | null>(null);
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

  const handleSelectedItemChange = (changes: UseComboboxStateChange<PlayableAudio>) => {
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
