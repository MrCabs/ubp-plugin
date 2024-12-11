import React, { useEffect, useState } from 'react';
import { Alert } from '@twilio-paste/core/alert';
import { UnorderedList, OrderedList, ListItem } from '@twilio-paste/core/list';
import { Box } from '@twilio-paste/core/box';
import { Heading } from '@twilio-paste/core/heading';
import { Text } from '@twilio-paste/core/text';
import { withTaskContext, ITask } from '@twilio/flex-ui';

import { DisplayConfig, DisplayElement } from '../../types/ServiceConfiguration';
import { getDisplayConfig } from '../../helpers/DisplayHelper';

interface CustomAttributesDisplayProps {
  task?: ITask;
  config?: DisplayConfig;
  displayType: 'error' | 'non-error';
}

const CustomAttributesDisplay = ({ task, config: propConfig, displayType }: CustomAttributesDisplayProps) => {
  const [displayConfig, setDisplayConfig] = useState<DisplayConfig | null>(propConfig || null);

  useEffect(() => {
    if (!task) return;

    if (!propConfig) {
      const taskConfig = getDisplayConfig(task);
      if (taskConfig) {
        // Filter based on displayType
        const filteredConfig = taskConfig.filter((element) =>
          displayType === 'error' ? element.type === 'error' : element.type !== 'error',
        );
        setDisplayConfig(filteredConfig.length > 0 ? filteredConfig : null);
      }
    }
  }, [task, propConfig, displayType]);

  if (!displayConfig) return null;

  const renderElement = (config: DisplayElement, index: number) => {
    switch (config.type) {
      case 'error':
        return (
          <Box marginBottom="space40" key={`error-${index}`}>
            <Alert variant={config.options.severity || 'error'}>
              <strong>{config.attributes.title}: </strong>
              {config.attributes.message || 'An error occurred'}
            </Alert>
          </Box>
        );

      case 'card':
        return (
          <Box
            key={`card-${index}`}
            borderWidth="borderWidth10"
            borderStyle="solid"
            borderColor="colorBorderWeaker"
            borderRadius="borderRadius20"
            backgroundColor="colorBackgroundBody"
            padding="space50"
            marginTop="space40"
          >
            {config.attributes.title && (
              <Box>
                <Heading as="h5" variant="heading50">
                  {config.attributes.title}
                </Heading>
              </Box>
            )}
            <Box as="dl" margin="space0">
              {Object.entries(config.attributes)
                .filter(([key]) => key !== 'title')
                .map(([key, value]) => (
                  <Box key={key} display="flex" flexWrap="wrap" marginBottom="space30" alignItems="flex-start">
                    <Box
                      as="dt"
                      width={{ base: '100%', sm: '30%' }}
                      paddingRight="space40"
                      display="flex"
                      alignItems="flex-start"
                    >
                      <Text as="span">{key}</Text>
                      <Text as="span" marginLeft="space20">
                        :
                      </Text>
                    </Box>
                    <Box as="dd" margin="space0" width={{ base: '100%', sm: '70%' }}>
                      <Text as="span">{String(value)}</Text>
                    </Box>
                  </Box>
                ))}
            </Box>
          </Box>
        );

      case 'list':
        const ListComponent = config.options.ordered ? OrderedList : UnorderedList;
        const items = config.attributes.items || [];
        const visibleItems = config.options.maxVisibleItems ? items.slice(0, config.options.maxVisibleItems) : items;

        return (
          <Box as="div" key={`list-${index}`}>
            {config.attributes.title && (
              <Heading as="h3" variant="heading30" marginBottom="space0">
                {config.attributes.title}
              </Heading>
            )}
            <ListComponent>
              {visibleItems.map((item, idx) => (
                <ListItem key={idx}>{String(item)}</ListItem>
              ))}
            </ListComponent>
            {config.options.expandable && items.length > visibleItems.length && (
              <Box as="div" marginTop="space20">
                <Text as="span" color="colorTextWeak">
                  {items.length - visibleItems.length} more items...
                </Text>
              </Box>
            )}
          </Box>
        );

      case 'notification':
        return (
          <Box key={`card-${index}`} padding="space50" marginTop="space40">
            <Alert
              key={`notification-${index}`}
              variant={config.options.severity || 'neutral'}
              onDismiss={
                config.options.dismissible
                  ? () => {
                      setDisplayConfig((prev) => {
                        if (!prev) return null;
                        const newConfig = [...prev];
                        newConfig.splice(index, 1);
                        return newConfig.length > 0 ? newConfig : null;
                      });
                    }
                  : undefined
              }
            >
              <Heading as="h5" variant="heading50">
                {config.attributes.title}
              </Heading>
              <Text as="p">{config.attributes.message}</Text>
            </Alert>
          </Box>
        );

      default:
        return null;
    }
  };

  return <Box>{displayConfig.map((element, index) => renderElement(element, index))}</Box>;
};

export default withTaskContext(CustomAttributesDisplay);
