import { useState, useEffect } from 'react';
import { Stack } from '@twilio-paste/core/stack';
import { Switch } from '@twilio-paste/core/switch';
import { Label } from '@twilio-paste/core/label';
import { Input } from '@twilio-paste/core/input';
import { Text } from '@twilio-paste/core/text';
import { Heading } from '@twilio-paste/core/heading';
import { HelpText } from '@twilio-paste/core/help-text';
import { Grid, Column } from '@twilio-paste/core/grid';
import { Box } from '@twilio-paste/core/box';
import { Manager, templates } from '@twilio/flex-ui';
import { InformationIcon } from '@twilio-paste/icons/esm/InformationIcon';
import { Tooltip } from '@twilio-paste/core/tooltip';
import { InputBox } from '@twilio-paste/core/input-box';
import { Separator } from '@twilio-paste/core/separator';
import { Button } from '@twilio-paste/core/button';

import { useAccess } from '../../../flex-hooks/hooks/useAccess';
import { useConfiguration } from '../../../flex-hooks/hooks/useConfiguration';
import { useBreakpoint } from '../../../flex-hooks/hooks/useBreakpoint';
import { ConfigCard } from '../../../flex-hooks/components/ConfigCard';
import { SaveButton } from '../../../flex-hooks/components/SaveButton';
import { NoAccessAlert } from '../../../flex-hooks/components/NoAccessAlert';
import { useFormValidation } from '../../../flex-hooks/hooks/useFormValidation';
import { LastUpdatedInfo } from '../../../flex-hooks/components/LastUpdatedInfo';
import { StringTemplates } from '../../../flex-hooks/strings';

interface AgentAutomationProps {
  toasterSuccessNotification: (message: string) => void;
}

export interface AgentAutomationConfig {
  channel: string;
  auto_accept: boolean;
  auto_select: boolean;
  auto_wrapup: boolean;
  wrapup_time: number;
  allow_extended_wrapup: boolean;
  extended_wrapup_time: number;
  default_outcome: string;
  required_attributes: string[];
  required_worker_attributes: string[];
  last_updated: string;
  updated_by: string;
}

const defaultConfig: AgentAutomationConfig = {
  channel: 'voice',
  auto_accept: false,
  auto_select: false,
  auto_wrapup: false,
  wrapup_time: 30000,
  allow_extended_wrapup: false,
  extended_wrapup_time: 0,
  default_outcome: '',
  required_attributes: [],
  required_worker_attributes: [],
  last_updated: new Date().toISOString(),
  updated_by: Manager.getInstance().user?.identity || '',
};

const validationRules = {
  wrapup_time: [
    {
      validator: (value: number) => !value || value >= 2000,
      message: 'Wrapup time must be at least 2 seconds (2000ms)',
    },
  ],
  default_outcome: [
    {
      validator: (value: string) => !value || value.trim().length > 0,
      message: 'Default outcome is required',
    },
  ],
};

const AgentAutomation = ({ toasterSuccessNotification }: AgentAutomationProps) => {
  const { hasAccess } = useAccess();
  const { config, isLoading, error, saveConfig } = useConfiguration<AgentAutomationConfig>({
    defaultConfig,
    featureName: 'agent_automation',
    isArrayConfig: true,
  });

  const [localConfig, setLocalConfig] = useState<AgentAutomationConfig>(defaultConfig);
  const [hasChanges, setHasChanges] = useState(false);
  const { isMobile, isTablet } = useBreakpoint();
  const { errors: validationErrors, validate, clearError } = useFormValidation(validationRules);

  const shouldShowSeparator = isMobile || isTablet;

  // Sync localConfig with config when it changes
  useEffect(() => {
    if (config) {
      setLocalConfig(config);
    }
  }, [config]);

  const handleConfigChange = (updates: Partial<AgentAutomationConfig>) => {
    setLocalConfig((prev) => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const handleWrapupTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const value = inputValue === '' ? 0 : parseInt(inputValue, 10) || 0;
    handleConfigChange({ wrapup_time: value });
    clearError('wrapup_time');
  };

  const handleOutcomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    handleConfigChange({ default_outcome: value });
    clearError('default_outcome');
  };

  const handleSave = async () => {
    if (!validate(localConfig)) {
      return;
    }

    try {
      const updatedConfig = {
        ...localConfig,
        channel: 'voice',
        last_updated: new Date().toISOString(),
        updated_by: Manager.getInstance().user?.identity || '',
      };

      await saveConfig(updatedConfig);
      toasterSuccessNotification(templates[StringTemplates.SuccessUpdatingConfig]());
      setHasChanges(false);
    } catch (err) {
      console.error('Error saving agent automation settings:', err);
    }
  };

  const handleCancel = () => {
    setLocalConfig(config);
    setHasChanges(false);
  };

  const renderWrapupTimeInput = () => {
    const seconds = localConfig.wrapup_time / 1000;
    return (
      <Box>
        <Stack orientation="vertical" spacing="space40">
          <Label htmlFor="wrapup_time" required>
            Wrapup Time
          </Label>
          <InputBox element="" hasError={Boolean(validationErrors.wrapup_time)}>
            <Input
              id="wrapup_time"
              type="text"
              value={localConfig.wrapup_time.toString()}
              onChange={handleWrapupTimeChange}
              insertBefore="ms"
              aria-label="Wrapup time in milliseconds"
              aria-invalid={Boolean(validationErrors.wrapup_time)}
            />
          </InputBox>
          {validationErrors.wrapup_time && (
            <Text as="span" color="colorTextError">
              {validationErrors.wrapup_time}
            </Text>
          )}
          <HelpText>
            {localConfig.wrapup_time}ms = {seconds} seconds
          </HelpText>
        </Stack>
      </Box>
    );
  };

  const renderDefaultOutcomeInput = () => (
    <Box>
      <Stack orientation="vertical" spacing="space40">
        <Label htmlFor="default_outcome" required>
          Default Outcome
        </Label>
        <InputBox element="" hasError={Boolean(validationErrors.default_outcome)}>
          <Input
            id="default_outcome"
            type="text"
            value={localConfig.default_outcome}
            onChange={handleOutcomeChange}
            placeholder="Enter default outcome"
            aria-label="Enter default outcome"
            aria-invalid={Boolean(validationErrors.default_outcome)}
          />
        </InputBox>
        {validationErrors.default_outcome && (
          <Text as="span" color="colorTextError">
            {validationErrors.default_outcome}
          </Text>
        )}
        <HelpText>The outcome to set when auto-completing wrapup</HelpText>
      </Stack>
    </Box>
  );

  if (!hasAccess) {
    return <NoAccessAlert />;
  }

  return (
    <ConfigCard error={error}>
      <Box marginBottom="space80">
        <Heading as="h2" variant="heading30">
          Agent Workflow
        </Heading>
        <Text as="p" color="colorTextWeak" marginTop="space30">
          Configure automated behaviors for your agents to streamline their workflow and improve efficiency.
        </Text>
      </Box>

      <Stack orientation="vertical" spacing="space70">
        <Grid gutter="space80" vertical={[true, true, false, false]}>
          {/* Left Column */}
          <Column span={[12, 12, 6, 6]}>
            <Stack orientation="vertical" spacing="space70">
              {/* Auto Accept Section */}
              <Box>
                <Stack orientation="vertical" spacing="space40">
                  <Stack orientation="horizontal" spacing="space20">
                    <Heading as="h5" variant="heading50">
                      Auto Accept
                    </Heading>
                    <Tooltip text="Automatically accepts incoming calls for agents">
                      <InformationIcon
                        decorative={false}
                        title="When enabled, incoming calls will be automatically accepted."
                        size="sizeIcon20"
                      />
                    </Tooltip>
                  </Stack>
                  <Switch
                    id="auto_accept"
                    checked={localConfig.auto_accept}
                    onChange={(e) => handleConfigChange({ auto_accept: e.target.checked })}
                  >
                    Enable Auto Accept
                  </Switch>
                </Stack>
              </Box>

              {shouldShowSeparator && <Separator orientation="horizontal" verticalSpacing="space70" />}

              {/* Wrapup Time Section */}
              {localConfig.auto_wrapup && renderWrapupTimeInput()}
            </Stack>
          </Column>

          {/* Right Column */}
          <Column span={[12, 12, 6, 6]}>
            <Stack orientation="vertical" spacing="space70">
              {/* Auto Wrapup Section */}
              <Box>
                <Stack orientation="vertical" spacing="space40">
                  <Stack orientation="horizontal" spacing="space20">
                    <Heading as="h5" variant="heading50">
                      Auto Wrapup
                    </Heading>
                    <Tooltip text="Automatically completes task wrap-up after specified time">
                      <InformationIcon
                        decorative={false}
                        title="When enabled, tasks will be automatically wrapped up after the configured time."
                        size="sizeIcon20"
                      />
                    </Tooltip>
                  </Stack>
                  <Switch
                    id="auto_wrapup"
                    checked={localConfig.auto_wrapup}
                    onChange={(e) => handleConfigChange({ auto_wrapup: e.target.checked })}
                  >
                    Enable Auto Wrapup
                  </Switch>
                </Stack>
              </Box>

              {/* Default Outcome Section */}
              {localConfig.auto_wrapup && renderDefaultOutcomeInput()}
            </Stack>
          </Column>
        </Grid>

        {/* Action Buttons */}
        {hasChanges && (
          <Box marginTop="space60">
            <Stack orientation="horizontal" spacing="space40">
              <SaveButton isLoading={isLoading} onClick={handleSave} />
              <Button variant="secondary" onClick={handleCancel} disabled={isLoading}>
                Cancel
              </Button>
            </Stack>
          </Box>
        )}

        {/* Last Updated Information */}
        {config.last_updated && <LastUpdatedInfo lastUpdated={config.last_updated} updatedBy={config.updated_by} />}
      </Stack>
    </ConfigCard>
  );
};

export default AgentAutomation;
