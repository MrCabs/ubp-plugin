import React, { useState } from 'react';
import { TaskHelper, ITask, styled, templates } from '@twilio/flex-ui';
import { Box } from '@twilio-paste/core/box';
import { ButtonGroup } from '@twilio-paste/core/button-group';
import { Button } from '@twilio-paste/core/button';
import { Tooltip } from '@twilio-paste/core/tooltip';
import { Text } from '@twilio-paste/core/text';
import { AgentIcon } from '@twilio-paste/icons/esm/AgentIcon';
import { ProductContactCenterTeamsIcon } from '@twilio-paste/icons/esm/ProductContactCenterTeamsIcon';
import { ProductPhoneNumbersIcon } from '@twilio-paste/icons/esm/ProductPhoneNumbersIcon';
import { CallTransferIcon } from '@twilio-paste/icons/esm/CallTransferIcon';
import { CallOutgoingIcon } from '@twilio-paste/icons/esm/CallOutgoingIcon';
import { SendIcon } from '@twilio-paste/icons/esm/SendIcon';
import { ChatIcon } from '@twilio-paste/icons/esm/ChatIcon';

import { DirectoryEntry } from '../types/DirectoryEntry';
import { StringTemplates } from '../flex-hooks/strings/CustomTransferDirectory';

export interface DirectoryItemProps {
  entry: DirectoryEntry;
  task: ITask;
  onTransferClick: (options: any) => void;
}

const DirectoryItemContainer = styled('div')`
  padding-inline: 0.5rem;
  min-height: 40px;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  position: relative;
  width: 100%;
`;

const ClosedBadge = styled('div')`
  background-color: #0263e0;
  color: #ffffff;
  font-size: 10px;
  font-weight: normal;
  padding: 0px 4px;
  border-radius: 4px;
  text-transform: uppercase;
  cursor: pointer;
`;

const DisabledText = styled(Text)`
  color: var(--twilio-gray-60);
`;

const EntryRow = styled('div')`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
`;

const LabelContainer = styled('div')`
  display: flex;
  flex: 1;
`;

const BadgeContainer = styled('div')`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-right: 16px;
  position: relative;
`;

// Custom tooltip implementation for better z-index control
const TooltipContainer = styled('div')`
  position: absolute;
  bottom: 100%;
  right: 0;
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  margin-bottom: 8px;
  z-index: 9999;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s;

  &.visible {
    opacity: 1;
  }

  &:after {
    content: '';
    position: absolute;
    top: 100%;
    right: 10px;
    border-width: 6px;
    border-style: solid;
    border-color: rgba(0, 0, 0, 0.8) transparent transparent transparent;
  }
`;

const DirectoryItem = (props: DirectoryItemProps) => {
  const { entry, task, onTransferClick } = props;
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Determine if this entry is disabled due to scheduling
  const isDisabled = !entry.cold_transfer_enabled && !entry.warm_transfer_enabled;

  const onWarmTransferClick = () => {
    onTransferClick({ mode: 'WARM' });
  };

  const onColdTransferClick = () => {
    onTransferClick({ mode: 'COLD' });
  };

  const renderIcon = (): React.JSX.Element => {
    if (entry.icon) {
      return entry.icon();
    }

    switch (entry.type) {
      case 'number':
        return <ProductPhoneNumbersIcon decorative={true} />;
      case 'queue':
        return <ProductContactCenterTeamsIcon decorative={true} />;
      default:
        return <AgentIcon decorative={true} />;
    }
  };

  // Custom badge with direct tooltip management
  const renderBadge = (): React.JSX.Element | null => {
    if (!isDisabled) return null;

    return (
      <BadgeContainer>
        <ClosedBadge onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
          Closed
        </ClosedBadge>
        <TooltipContainer className={showTooltip ? 'visible' : ''}>
          This hotline is currently closed according to its schedule
        </TooltipContainer>
      </BadgeContainer>
    );
  };

  const renderLabel = (): React.JSX.Element => (
    <Box key={`directory-item-label-${entry.type}-${entry.key}`} element="TRANSFER_DIR_COMMON_ROW_LABEL" width="100%">
      <EntryRow>
        <LabelContainer>
          {entry.labelComponent ? (
            entry.labelComponent()
          ) : isDisabled ? (
            <DisabledText as="div" className="Twilio" element="TRANSFER_DIR_COMMON_ROW_NAME">
              {entry.label}
            </DisabledText>
          ) : (
            <Text as="div" className="Twilio" element="TRANSFER_DIR_COMMON_ROW_NAME">
              {entry.label}
            </Text>
          )}
        </LabelContainer>

        {renderBadge()}
      </EntryRow>
    </Box>
  );

  return (
    <DirectoryItemContainer
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      key={`directory-item-container-${entry.type}-${entry.key}`}
    >
      <Box key={`directory-item-icon-${entry.type}-${entry.key}`} element="TRANSFER_DIR_COMMON_ROW_ICON">
        {renderIcon()}
      </Box>

      {isHovered && entry.tooltip ? (
        <Tooltip
          key={`directory-item-label-tooltip-${entry.type}-${entry.key}`}
          element="TRANSFER_DIR_COMMON_TOOLTIP"
          text={entry.tooltip}
        >
          {renderLabel()}
        </Tooltip>
      ) : (
        renderLabel()
      )}

      {isHovered && (
        <ButtonGroup key={`directory-item-buttongroup-${entry.type}-${entry.key}`} attached>
          {entry.warm_transfer_enabled ? (
            <Tooltip
              key={`directory-item-buttons-warm-transfer-tooltip-${entry.type}-${entry.key}`}
              element="TRANSFER_DIR_COMMON_TOOLTIP"
              text={templates[StringTemplates.WarmTransfer]()}
            >
              <Button
                element="TRANSFER_DIR_COMMON_ROW_BUTTON"
                key={`directory-item-warm-transfer-button-${entry.type}-${entry.key}`}
                variant="secondary_icon"
                size="circle"
                onClick={onWarmTransferClick}
              >
                {task && TaskHelper.isChatBasedTask(task) ? (
                  <ChatIcon
                    key={`directory-item-warm-transfer-icon-${entry.type}-${entry.key}`}
                    decorative={false}
                    title=""
                  />
                ) : (
                  <CallTransferIcon
                    key={`directory-item-warm-transfer-icon-${entry.type}-${entry.key}`}
                    decorative={false}
                    title=""
                  />
                )}
              </Button>
            </Tooltip>
          ) : (
            <div></div>
          )}
          {entry.cold_transfer_enabled ? (
            <Tooltip
              key={`directory-item-buttons-cold-transfer-tooltip-${entry.type}-${entry.key}`}
              element="TRANSFER_DIR_COMMON_TOOLTIP"
              text={templates[StringTemplates.ColdTransfer]()}
            >
              <Button
                element="TRANSFER_DIR_COMMON_ROW_BUTTON"
                key={`directory-item-warm-transfer-button-${entry.type}-${entry.key}`}
                variant="secondary_icon"
                size="circle"
                onClick={onColdTransferClick}
              >
                {task && TaskHelper.isChatBasedTask(task) ? (
                  <SendIcon
                    key={`directory-item-cold-transfer-icon-${entry.type}-${entry.key}`}
                    decorative={false}
                    title=""
                  />
                ) : (
                  <CallOutgoingIcon
                    key={`directory-item-cold-transfer-icon-${entry.type}-${entry.key}`}
                    decorative={false}
                    title=""
                  />
                )}
              </Button>
            </Tooltip>
          ) : (
            <div></div>
          )}
        </ButtonGroup>
      )}
    </DirectoryItemContainer>
  );
};

export default DirectoryItem;
