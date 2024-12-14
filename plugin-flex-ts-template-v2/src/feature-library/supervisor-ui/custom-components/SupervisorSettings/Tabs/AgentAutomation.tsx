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
import { Template, templates, Manager } from '@twilio/flex-ui';

import SupervisorUiService, { AgentAutomationConfig } from '../../../utils/SupervisorUiService';
import { StringTemplates } from '../../../flex-hooks/strings';

interface AgentAutomationProps {
  toasterSuccessNotification: (message: string) => void;
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
};

const AgentAutomation: React.FC<AgentAutomationProps> = ({ toasterSuccessNotification }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [config, setConfig] = useState<AgentAutomationConfig>(defaultConfig);

  // Check if user has admin or supervisor role
  const userRoles = Manager.getInstance().user?.roles || [];
  const hasAccess = userRoles.some(role => ['admin', 'supervisor'].includes(role));

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setIsLoading(true);
      const response = await SupervisorUiService.fetchUiAttributes();
      console.log('🚀 ~ fetchConfig ~ response:', response);
      console.log('test', response.configuration.custom_data.features.agent_automation.configuration);
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

  const handleSave = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Get current config
      const response = await SupervisorUiService.fetchUiAttributes();
      const currentConfig = response?.configuration?.custom_data?.features?.agent_automation?.configuration || [];
      // Update or add voice channel config
      const updatedConfig = [...currentConfig];
      const voiceIndex = updatedConfig.findIndex((cfg: AgentAutomationConfig) => cfg.channel === 'voice');

      if (voiceIndex >= 0) {
        updatedConfig[voiceIndex] = config;
      } else {
        updatedConfig.push(config);
      }

      // Prepare update payload with correct structure
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

      // Refresh config after update
      await fetchConfig();
    } catch (err) {
      setError(templates[StringTemplates.ErrorUpdatingConfig]());
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasAccess) {
    return (
      <Alert variant="warning">
        <Template source={templates.NoPermissionError} />
      </Alert>
    );
  }

  if (isLoading && !config) {
    return (
      <Stack orientation="horizontal" spacing="space30">
        <Spinner decorative={false} title="Loading configuration" size="sizeIcon20" />
        <Text as="span">Loading configuration...</Text>
      </Stack>
    );
  }

  return (
    <Stack orientation="vertical" spacing="space60">
      <Card>
        <Stack orientation="vertical" spacing="space60">
          {error && <Alert variant="error">{error}</Alert>}

          <Stack orientation="vertical" spacing="space60">
            <Stack orientation="vertical" spacing="space40">
              <Heading as="h5" variant="heading50">
                Auto Accept
              </Heading>
              <HelpText>When enabled, incoming call will be automatically accepted.</HelpText>
              <Switch
                id="auto_accept"
                checked={config.auto_accept}
                onChange={(e) => setConfig({ ...config, auto_accept: e.target.checked })}
              >
                Enable Auto Accept
              </Switch>
            </Stack>

            <Stack orientation="vertical" spacing="space40">
              <Heading as="h5" variant="heading50">
                Auto Wrapup
              </Heading>
              <HelpText>When enabled, tasks will be automatically wrapup after the configured time.</HelpText>
              <Switch
                id="auto_wrapup"
                checked={config.auto_wrapup}
                onChange={(e) => setConfig({ ...config, auto_wrapup: e.target.checked })}
              >
                Enable Auto Wrapup
              </Switch>
            </Stack>

            {config.auto_wrapup && (
              <>
                <Stack orientation="vertical" spacing="space40">
                  <Label htmlFor="wrapup_time">
                    Wrapup Time (ms)
                    <Input
                      id="wrapup_time"
                      type="number"
                      value={config.wrapup_time.toString()}
                      onChange={(e) => setConfig({ ...config, wrapup_time: parseInt(e.target.value, 10) })}
                    />
                    <Text as="span" fontSize="fontSize20" color="colorTextWeak">
                      Time in milliseconds before auto completing wrapup
                    </Text>
                  </Label>
                </Stack>

                <Stack orientation="vertical" spacing="space40">
                  <Label htmlFor="default_outcome">
                    Default Outcome
                    <Input
                      id="default_outcome"
                      type="text"
                      value={config.default_outcome}
                      onChange={(e) => setConfig({ ...config, default_outcome: e.target.value })}
                    />
                    <Text as="span" fontSize="fontSize20" color="colorTextWeak">
                      The outcome to set when auto completing wrapup
                    </Text>
                  </Label>
                </Stack>
              </>
            )}
          </Stack>

          <Stack orientation="horizontal" spacing="space30">
            <Button variant="primary" onClick={handleSave} disabled={isLoading}>
              {isLoading ? <Spinner decorative={false} title="Saving changes" size="sizeIcon20" /> : 'Save Changes'}
            </Button>
          </Stack>
        </Stack>
      </Card>
    </Stack>
  );
};

export default AgentAutomation;