import { useState, useEffect } from 'react';
import { Card } from '@twilio-paste/core/card';
import { Stack } from '@twilio-paste/core/stack';
import { Switch } from '@twilio-paste/core/switch';
import { Label } from '@twilio-paste/core/label';
import { Input } from '@twilio-paste/core/input';
import { Button } from '@twilio-paste/core/button';
import { Alert } from '@twilio-paste/core/alert';
import { Spinner } from '@twilio-paste/core/spinner';
import { Text } from '@twilio-paste/core/text';
import { Heading } from '@twilio-paste/core/heading';
import { HelpText } from '@twilio-paste/core/help-text';
import { Grid, Column } from '@twilio-paste/core/grid';
import { Box } from '@twilio-paste/core/box';
import { Template, templates, Manager } from '@twilio/flex-ui';
import { InformationIcon } from '@twilio-paste/icons/esm/InformationIcon';
import { Tooltip } from '@twilio-paste/core/tooltip';
import { InputBox } from '@twilio-paste/core/input-box';
import { Separator } from '@twilio-paste/core/separator';

import SupervisorUiService from '../../../utils/SupervisorUiService';
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
}

const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);
    media.addEventListener('change', listener);

    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
};

const useBreakpoint = () => {
  const isMobile = useMediaQuery('(max-width: 575px)');
  const isTablet = useMediaQuery('(min-width: 576px) and (max-width: 991px)');
  const isDesktop = useMediaQuery('(min-width: 992px)');

  return {
    isMobile,
    isTablet,
    isDesktop,
  };
};

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
};

const AgentAutomation = ({ toasterSuccessNotification }: AgentAutomationProps) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [config, setConfig] = useState<AgentAutomationConfig>(defaultConfig);
  const { isMobile, isTablet } = useBreakpoint();
  const shouldShowSeparator = isMobile || isTablet;
  const [validationErrors, setValidationErrors] = useState<{
    wrapup_time?: string;
    default_outcome?: string;
  }>({});

  // Check if user has admin or supervisor role
  const userRoles = Manager.getInstance().user?.roles || [];
  const hasAccess = userRoles.some((role) => ['admin', 'supervisor'].includes(role));

  useEffect(() => {
    fetchConfig();
  }, []);

  const validateForm = (): boolean => {
    const errors: { wrapup_time?: string; default_outcome?: string } = {};
    let isValid = true;

    if (config.auto_wrapup) {
      // Validate wrapup time
      if (!config.wrapup_time) {
        errors.wrapup_time = 'Wrapup time is required';
        isValid = false;
      } else if (config.wrapup_time < 2000) {
        errors.wrapup_time = 'Wrapup time must be at least 2 seconds (2000ms)';
        isValid = false;
      }

      // Validate outcome
      if (!config.default_outcome.trim()) {
        errors.default_outcome = 'Default outcome is required';
        isValid = false;
      }
    }

    setValidationErrors(errors);
    return isValid;
  };

  const handleWrapupTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setConfig({ ...config, wrapup_time: value });

    // Clear validation error when field is valid
    if (value >= 2000) {
      setValidationErrors((prev) => ({ ...prev, wrapup_time: undefined }));
    }
  };

  const handleOutcomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setConfig({ ...config, default_outcome: value });

    // Clear validation error when field is valid
    if (value.trim()) {
      setValidationErrors((prev) => ({ ...prev, default_outcome: undefined }));
    }
  };

  const fetchConfig = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await SupervisorUiService.fetchUiAttributes();

      if (response?.configuration?.custom_data?.features?.agent_automation?.configuration) {
        const voiceConfig = response.configuration.custom_data.features.agent_automation.configuration.find(
          (cfg: AgentAutomationConfig) => cfg.channel === 'voice',
        );

        if (voiceConfig) {
          setConfig({
            ...defaultConfig,
            ...voiceConfig,
          });
        }
      }
    } catch (err) {
      setError(templates[StringTemplates.ErrorFetchingConfig]());
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (): Promise<void> => {
    if (!validateForm()) {
      return;
    }
    try {
      setIsLoading(true);
      setError('');

      const response = await SupervisorUiService.fetchUiAttributes();
      const currentConfig = response?.configuration?.custom_data?.features?.agent_automation?.configuration || [];
      const updatedConfig = [...currentConfig];
      const voiceIndex = updatedConfig.findIndex((cfg: AgentAutomationConfig) => cfg.channel === 'voice');

      if (voiceIndex >= 0) {
        updatedConfig[voiceIndex] = config;
      } else {
        updatedConfig.push(config);
      }

      const attributesUpdate = JSON.stringify({
        custom_data: {
          features: {
            agent_automation: {
              configuration: updatedConfig,
              enabled: true,
            },
          },
        },
      });

      await SupervisorUiService.updateUiAttributes(attributesUpdate, true);
      toasterSuccessNotification(templates[StringTemplates.SuccessUpdatingConfig]());
      await fetchConfig();
    } catch (err) {
      setError(templates[StringTemplates.ErrorUpdatingConfig]());
    } finally {
      setIsLoading(false);
    }
  };

  // Update the wrapup time input to show validation errors
  const renderWrapupTimeInput = () => (
    <Box>
      <Stack orientation="vertical" spacing="space40">
        <Label htmlFor="wrapup_time" required>
          Wrapup Time
        </Label>
        <InputBox element="" hasError={Boolean(validationErrors.wrapup_time)}>
          <Input
            id="wrapup_time"
            type="number"
            value={config.wrapup_time.toString()}
            onChange={handleWrapupTimeChange}
            min="2000"
            max="300000"
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
        <HelpText>Time in milliseconds (1000ms = 1 second)</HelpText>
      </Stack>
    </Box>
  );

  // Update the default outcome input to show validation errors
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
            value={config.default_outcome}
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
    return (
      <Alert variant="warning">
        <Template source={templates.NoPermissionError} />
      </Alert>
    );
  }

  return (
    <Box maxWidth="100%">
      <Card padding="space70">
        {error && <Alert variant="error">{error}</Alert>}

        <Box marginBottom="space80">
          <Heading as="h4" variant="heading40">
            Overview
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
                      checked={config.auto_accept}
                      onChange={(e) => setConfig({ ...config, auto_accept: e.target.checked })}
                    >
                      Enable Auto Accept
                    </Switch>
                  </Stack>
                </Box>

                {shouldShowSeparator && <Separator orientation="horizontal" verticalSpacing="space70" />}

                {/* Wrapup Time Section */}
                {config.auto_wrapup && renderWrapupTimeInput()}
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
                      checked={config.auto_wrapup}
                      onChange={(e) => setConfig({ ...config, auto_wrapup: e.target.checked })}
                    >
                      Enable Auto Wrapup
                    </Switch>
                  </Stack>
                </Box>

                {/* Default Outcome Section */}
                {config.auto_wrapup && renderDefaultOutcomeInput()}
              </Stack>
            </Column>
          </Grid>

          <Box marginTop="space60">
            <Button variant="primary" onClick={handleSave} disabled={isLoading}>
              {isLoading ? (
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
    </Box>
  );
};

export default AgentAutomation;
