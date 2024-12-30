import { useState, useEffect } from 'react';
import { Card } from '@twilio-paste/core/card';
import { Stack } from '@twilio-paste/core/stack';
import { Switch } from '@twilio-paste/core/switch';
import { Badge } from '@twilio-paste/core/badge';
import { Box } from '@twilio-paste/core/box';
import { Heading } from '@twilio-paste/core/heading';
import { HelpText } from '@twilio-paste/core/help-text';
import { Separator } from '@twilio-paste/core/separator';
import { Template, templates, Manager } from '@twilio/flex-ui';
import { Alert } from '@twilio-paste/core/alert';
import { Text } from '@twilio-paste/core/text';
import { Button } from '@twilio-paste/core/button';
import { Spinner } from '@twilio-paste/core/spinner';

import SupervisorUiService from '../../../utils/SupervisorUiService';
import { StringTemplates } from '../../../flex-hooks/strings';

interface IvrAndBcpSettingsProps {
  toasterSuccessNotification: (message: string) => void;
}

type PasteBadgeVariant = 'success' | 'error' | 'warning' | 'neutral' | 'new';

export interface IvrSettingsConfig {
  ivr_enabled: boolean;
  bcp_mode: boolean;
  last_updated: string;
  updated_by: string;
}

const defaultConfig: IvrSettingsConfig = {
  ivr_enabled: true,
  bcp_mode: false,
  last_updated: new Date().toISOString(),
  updated_by: Manager.getInstance().user?.identity || '',
};

const IvrAndBcpSettings = ({ toasterSuccessNotification }: IvrAndBcpSettingsProps) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [config, setConfig] = useState<IvrSettingsConfig>(defaultConfig);
  const [localConfig, setLocalConfig] = useState<IvrSettingsConfig>(defaultConfig);
  const [hasChanges, setHasChanges] = useState(false);

  // Check if user has admin or supervisor role
  const userRoles = Manager.getInstance().user?.roles || [];
  const hasAccess = userRoles.some((role) => ['admin', 'supervisor'].includes(role));

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await SupervisorUiService.fetchUiAttributes();

      if (response?.configuration?.custom_data?.features?.ivr_setting?.configuration) {
        const fetchedConfig = {
          ...defaultConfig,
          ...response.configuration.custom_data.features.ivr_setting.configuration,
        };
        setConfig(fetchedConfig);
        setLocalConfig(fetchedConfig);
      }
    } catch (err) {
      setError(templates[StringTemplates.ErrorFetchingConfig]());
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError('');

      const updatedConfig = {
        ...localConfig,
        last_updated: new Date().toISOString(),
        updated_by: Manager.getInstance().user?.identity || '',
      };

      // Remove the unused response variable
      await SupervisorUiService.fetchUiAttributes();

      const attributesUpdate = JSON.stringify({
        custom_data: {
          features: {
            ivr_setting: {
              configuration: updatedConfig,
              enabled: true,
            },
          },
        },
      });

      await SupervisorUiService.updateUiAttributes(attributesUpdate, true);
      toasterSuccessNotification(templates[StringTemplates.SuccessUpdatingConfig]());
      setConfig(updatedConfig);
      setLocalConfig(updatedConfig);
      setHasChanges(false);
    } catch (err) {
      setError(templates[StringTemplates.ErrorUpdatingConfig]());
    } finally {
      setIsLoading(false);
    }
  };

  const handleShutdownChange = (isShutdown: boolean) => {
    setLocalConfig((prev) => ({
      ...prev,
      ivr_enabled: !isShutdown,
      // If turning on IVR shutdown, turn off BCP mode
      bcp_mode: isShutdown ? false : prev.bcp_mode,
    }));
    setHasChanges(true);
  };

  const handleBCPChange = (isBCPActive: boolean) => {
    setLocalConfig((prev) => ({
      ...prev,
      bcp_mode: isBCPActive,
      // If turning on BCP mode, turn off IVR shutdown (enable IVR)
      ivr_enabled: isBCPActive ? true : prev.ivr_enabled,
    }));
    setHasChanges(true);
  };

  const handleCancel = () => {
    setLocalConfig(config);
    setHasChanges(false);
  };

  const getBcpBadgeInfo = (ivrEnabled: boolean, bcpMode: boolean): { variant: PasteBadgeVariant; text: string } => {
    if (ivrEnabled) {
      return {
        variant: bcpMode ? 'warning' : 'success',
        text: bcpMode ? 'BCP Mode Active' : 'Normal Operations',
      };
    }
    return {
      variant: 'error',
      text: 'Not Available - IVR Disabled',
    };
  };

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

        <Stack orientation="vertical" spacing="space70">
          {/* IVR Shutdown Section */}
          <Stack orientation="vertical" spacing="space60">
            <Heading as="h2" variant="heading30">
              IVR Settings
            </Heading>

            <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
              <Switch
                id="shutdown-ivr"
                checked={!localConfig.ivr_enabled}
                onChange={(event) => {
                  handleShutdownChange(event.target.checked);
                }}
                disabled={isLoading || localConfig.bcp_mode}
              >
                Shutdown IVR
              </Switch>
              <Badge as="span" variant={localConfig.ivr_enabled ? 'success' : 'error'}>
                {localConfig.ivr_enabled ? 'IVR is Enabled' : 'IVR is Disabled'}
              </Badge>
            </Box>

            <HelpText id="shutdown-ivr-help">
              Toggle this switch to disable the Interactive Voice Response (IVR) system. This action will deactivate all
              automated voice navigation and options for callers. Cannot be activated while BCP Mode is active.
            </HelpText>
          </Stack>

          <Separator orientation="horizontal" verticalSpacing="space70" />

          {/* BCP Section */}
          <Stack orientation="vertical" spacing="space60">
            <Heading as="h2" variant="heading30">
              Business Continuity Plan (BCP)
            </Heading>

            <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
              <Switch
                id="activate-bcp"
                checked={localConfig.bcp_mode}
                onChange={(event) => {
                  handleBCPChange(event.target.checked);
                }}
                disabled={isLoading || !localConfig.ivr_enabled}
              >
                Activate BCP Mode
              </Switch>
              <Badge as="span" variant={getBcpBadgeInfo(localConfig.ivr_enabled, localConfig.bcp_mode).variant}>
                {getBcpBadgeInfo(localConfig.ivr_enabled, localConfig.bcp_mode).text}
              </Badge>
            </Box>

            <Stack orientation="vertical" spacing="space30">
              <HelpText id="bcp-help">
                Toggle this switch to activate the Business Continuity Plan (BCP) mode. Cannot be activated while IVR is
                shutdown. When activated, this will:
              </HelpText>
              <Box marginLeft="space40">
                <Stack orientation="vertical" spacing="space20">
                  <Text as="p" fontSize="fontSize20">
                    • Redirect all incoming calls to backup call centers
                  </Text>
                  <Text as="p" fontSize="fontSize20">
                    • Enable emergency routing protocols
                  </Text>
                  <Text as="p" fontSize="fontSize20">
                    • Activate contingency workflows for critical operations
                  </Text>
                </Stack>
              </Box>
            </Stack>
          </Stack>

          {/* Action Buttons */}
          {hasChanges && (
            <Box marginTop="space60">
              <Stack orientation="horizontal" spacing="space40">
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
                <Button variant="secondary" onClick={handleCancel} disabled={isLoading}>
                  Cancel
                </Button>
              </Stack>
            </Box>
          )}

          {/* Last Updated Information */}
          {config.last_updated && (
            <Box marginTop="space40">
              <Text as="p" fontSize="fontSize20" color="colorTextWeak">
                Last updated: {new Date(config.last_updated).toLocaleString()} by {config.updated_by}
              </Text>
            </Box>
          )}
        </Stack>
      </Card>
    </Box>
  );
};

export default IvrAndBcpSettings;
