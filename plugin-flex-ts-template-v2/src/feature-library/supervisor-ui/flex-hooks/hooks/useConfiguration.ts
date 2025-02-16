import { useState, useEffect, useCallback } from 'react';
import { templates } from '@twilio/flex-ui';

import SupervisorUiService from '../../utils/SupervisorUiService';
import { StringTemplates } from '../strings';
import { getFeaturesConfig, isAuditLoggingEnabled } from '../../config';
import { saveAuditEvent } from '../../../../utils/helpers/AuditHelper';

interface ConfigHookOptions<T> {
  defaultConfig: T;
  featureName: string;
  isArrayConfig?: boolean; // indicate if config is array-based
  shouldAppendConfig?: boolean;
}

export const useConfiguration = <T>({
  defaultConfig,
  featureName,
  isArrayConfig = false,
  shouldAppendConfig = true,
}: ConfigHookOptions<T>) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [config, setConfig] = useState<T>(defaultConfig);

  const auditLog = (feature: string, oldValue: any, newValue: any) => {
    if (!isAuditLoggingEnabled()) {
      return;
    }
    saveAuditEvent(feature, `update-supervisor-setting`, oldValue, newValue);
  };

  const fetchConfig = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError('');

      if (getFeaturesConfig()?.[featureName]?.configuration) {
        const fetchedConfig = getFeaturesConfig()?.[featureName].configuration;

        if (isArrayConfig) {
          // For array configurations (like agent_automation), find the voice channel config
          const voiceConfig = Array.isArray(fetchedConfig)
            ? fetchedConfig.find((cfg: any) => cfg.channel === 'voice')
            : null;

          if (voiceConfig) {
            setConfig({
              ...defaultConfig,
              ...voiceConfig,
            });
          } else {
            setConfig(defaultConfig);
          }
        } else {
          // For single object configurations (like ivr_setting)
          setConfig({
            ...defaultConfig,
            ...fetchedConfig,
          });
        }
      } else {
        setConfig(defaultConfig);
      }
    } catch (err) {
      console.error('Error fetching configuration:', err);
      setError(templates[StringTemplates.ErrorFetchingConfig]());
      setConfig(defaultConfig);
    } finally {
      setIsLoading(false);
    }
  }, [featureName, defaultConfig, isArrayConfig]);

  const saveConfig = async (updatedConfig: T, appendConfig?: boolean): Promise<void> => {
    try {
      setIsLoading(true);
      setError('');

      const shouldAppend = typeof appendConfig === 'boolean' ? appendConfig : shouldAppendConfig;

      const currentConfigs = getFeaturesConfig()?.[featureName]?.configuration || [];

      if (isArrayConfig) {
        // Handle array configuration

        const configs = Array.isArray(currentConfigs) ? currentConfigs : [];

        const voiceIndex = configs.findIndex((cfg: any) => cfg.channel === 'voice');
        const newConfigs = [...configs];

        if (voiceIndex >= 0) {
          newConfigs[voiceIndex] = updatedConfig;
        } else {
          newConfigs.push(updatedConfig);
        }

        const attributesUpdate = JSON.stringify({
          custom_data: {
            features: {
              [featureName]: {
                configuration: newConfigs,
                enabled: true,
              },
            },
          },
        });

        await SupervisorUiService.updateUiAttributes(attributesUpdate, shouldAppend);
        auditLog(featureName, currentConfigs, newConfigs);
      } else {
        // Handle single object configuration
        const attributesUpdate = JSON.stringify({
          custom_data: {
            features: {
              [featureName]: {
                configuration: updatedConfig,
                enabled: true,
              },
            },
          },
        });

        await SupervisorUiService.updateUiAttributes(attributesUpdate, shouldAppend);
        auditLog(featureName, currentConfigs, updatedConfig);
      }

      setConfig(updatedConfig);
      await fetchConfig(); // Refresh to ensure we have latest state

      return Promise.resolve();
    } catch (err) {
      console.error('Error saving configuration:', err);
      setError(templates[StringTemplates.ErrorUpdatingConfig]());
      return Promise.reject(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return {
    config,
    setConfig,
    isLoading,
    error,
    saveConfig,
    reFetch: fetchConfig,
  };
};
