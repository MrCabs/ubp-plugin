import { useState, useEffect } from 'react';
import { Stack } from '@twilio-paste/core/stack';
import { Switch } from '@twilio-paste/core/switch';
import { Badge } from '@twilio-paste/core/badge';
import { Box } from '@twilio-paste/core/box';
import { Heading } from '@twilio-paste/core/heading';
import { HelpText } from '@twilio-paste/core/help-text';
import { Separator } from '@twilio-paste/core/separator';
import { templates, Manager } from '@twilio/flex-ui';
import { Text } from '@twilio-paste/core/text';
import { Button } from '@twilio-paste/core/button';

import { useAccess } from '../../../flex-hooks/hooks/useAccess';
import { NoAccessAlert } from '../../../flex-hooks/components/NoAccessAlert';
import { useConfiguration } from '../../../flex-hooks/hooks/useConfiguration';
import { ConfigCard } from '../../../flex-hooks/components/ConfigCard';
import { SaveButton } from '../../../flex-hooks/components/SaveButton';
import { LastUpdatedInfo } from '../../../flex-hooks/components/LastUpdatedInfo';
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

const IvrAndBcpSettings = ({ toasterSuccessNotification }: IvrAndBcpSettingsProps) => {
  const { hasAccess } = useAccess();
  const { saveConfig, isLoading, error, config } = useConfiguration<IvrSettingsConfig>({
    defaultConfig,
    featureName: 'ivr_setting',
    isArrayConfig: false,
  });

  const [localConfig, setLocalConfig] = useState<IvrSettingsConfig>(defaultConfig);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (config) {
      setLocalConfig(config);
    }
  }, [config]);

  const handleShutdownChange = (isShutdown: boolean) => {
    setLocalConfig((prev) => ({
      ...prev,
      ivr_enabled: !isShutdown,
      bcp_mode: isShutdown ? false : prev.bcp_mode,
    }));
    setHasChanges(true);
  };

  const handleBCPChange = (isBCPActive: boolean) => {
    setLocalConfig((prev) => ({
      ...prev,
      bcp_mode: isBCPActive,
      ivr_enabled: isBCPActive ? true : prev.ivr_enabled,
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      const updatedConfig = {
        ...localConfig,
        last_updated: new Date().toISOString(),
        updated_by: Manager.getInstance().user?.identity || '',
      };
      await saveConfig(updatedConfig);
      toasterSuccessNotification(templates[StringTemplates.SuccessUpdatingConfig]());
      setHasChanges(false);
    } catch (err) {
      console.error('Error saving settings:', err);
    }
  };

  const handleCancel = () => {
    setLocalConfig(config);
    setHasChanges(false);
  };

  if (!hasAccess) {
    return <NoAccessAlert />;
  }

  return (
    <ConfigCard error={error}>
      <Stack orientation="vertical" spacing="space70">
        {/* IVR Shutdown Section */}
        <Stack orientation="vertical" spacing="space60">
          <Heading as="h2" variant="heading30">
            IVR Activation
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
                  • Bypass account and card number inputs
                </Text>
                <Text as="p" fontSize="fontSize20">
                  • Disable OTP verification and all self-service options
                </Text>
                <Text as="p" fontSize="fontSize20">
                  • Redirect all incoming calls to backup call flow
                </Text>
                <Text as="p" fontSize="fontSize20">
                  • Customers routed to an agent require manual verification
                </Text>
              </Stack>
            </Box>
          </Stack>
        </Stack>

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

export default IvrAndBcpSettings;
