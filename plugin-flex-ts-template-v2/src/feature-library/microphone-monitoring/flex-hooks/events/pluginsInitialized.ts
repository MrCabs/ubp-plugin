import * as Flex from '@twilio/flex-ui';

import { FlexEvent } from '../../../../types/feature-loader';
import { isFeatureEnabled } from '../../config';
import { MicrophoneMonitorService } from '../../services/MicrophoneMonitorService';

const RETRY_DELAY_MS = 500;
const MAX_INITIALIZATION_ATTEMPTS = 10;

let microphoneMonitorService: MicrophoneMonitorService | null = null;
let cleanupListenerRegistered = false;

const registerCleanupListener = () => {
  if (cleanupListenerRegistered) {
    return;
  }

  Flex.Actions.addListener('afterLogout', () => {
    if (microphoneMonitorService) {
      microphoneMonitorService.cleanup();
      microphoneMonitorService = null;
    }
    window.__microphoneMonitorService = undefined;
  });

  cleanupListenerRegistered = true;
};

export const eventName = FlexEvent.pluginsInitialized;
export const eventHook = function initializeMicrophoneMonitoring(_flex: typeof Flex, manager: Flex.Manager) {
  if (!isFeatureEnabled()) {
    return;
  }

  const initializeService = (attempt = 0) => {
    if (microphoneMonitorService) {
      return;
    }

    if (!manager.workerClient) {
      if (attempt >= MAX_INITIALIZATION_ATTEMPTS) {
        console.warn(
          '[microphone-monitoring] Worker client unavailable. Skipping microphone monitoring initialization.',
        );
        return;
      }

      setTimeout(() => initializeService(attempt + 1), RETRY_DELAY_MS);
      return;
    }

    const service = MicrophoneMonitorService.create(manager);
    service.initialize();
    microphoneMonitorService = service;
    window.__microphoneMonitorService = service;
    registerCleanupListener();
  };

  initializeService();
};
