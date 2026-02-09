import type { Manager as FlexManager, WorkerAttributes } from '@twilio/flex-ui';

const CONFIG = {
  SESSION_KEY: 'mic_session_data',
  LAST_ACTIVE_KEY: 'mic_last_active',
  WORKER_OFFLINE_START_KEY: 'worker_offline_start_time',
  OFFLINE_RESET_THRESHOLD: 4 * 60 * 60 * 1000, // 4 hours
  MAX_DAILY_TIME: 24 * 60 * 60 * 1000, // 24 hours
  UPDATE_INTERVAL: 1000, // 1 second
  SESSION_CHECK_INTERVAL: 5000, // 5 seconds
} as const;

const STORAGE_KEYS = {
  GRANTED_TIME: 'mic_permission_granted_time',
  DENIED_TIME: 'mic_permission_denied_time',
  LAST_DATE: 'mic_permission_last_date',
  HISTORY_PREFIX: 'mic_permission_history_',
  PARTIAL_PREFIX: 'mic_permission_partial_',
} as const;

type MicPermissionState = PermissionState;
type MicStatus = 'On' | 'Off';

type MicDurations = Record<MicPermissionState, number>;
type WorkerAttributeUpdate = WorkerAttributes & {
  mic?: string;
  micTimestamp?: number;
  micLastChanged?: string;
};

interface BrowserInfo {
  isFirefox: boolean;
  isChrome: boolean;
  isSafari: boolean;
  isEdge: boolean;
  userAgent: string;
}

interface SessionData {
  sessionId?: string;
  startTime?: number;
  isOnline?: boolean;
  micState?: MicPermissionState | null;
  lastStateChange?: number;
}

interface MicPermissionWindowState {
  state: MicPermissionState | null;
  lastStateChange: number;
  isAvailable: boolean;
  isSessionActive: boolean;
}

type IntervalId = ReturnType<typeof setInterval>;

type MicrophonePermissionDescriptor = PermissionDescriptor & {
  name: 'microphone';
};

declare global {
  interface Window {
    __micPermissionState?: MicPermissionWindowState;
    __resetMicTimer?: () => void;
    __debugMicTimer?: () => void;
    __updateWorkerMic?: (status: MicStatus) => Promise<WorkerAttributes>;
    __microphoneMonitorService?: MicrophoneMonitorService;
  }
}

const getTodayString = (): string => new Date().toISOString().split('T')[0];

class MicrophoneMonitorService {
  private readonly manager: FlexManager;

  private micState: MicPermissionState | null = null;

  private lastStateChangeTime: number = Date.now();

  private durations: MicDurations = {
    granted: 0,
    denied: 0,
    prompt: 0,
  };

  private readonly browserInfo: BrowserInfo;

  private fallbackCheckInterval: IntervalId | null = null;

  private sessionCheckInterval: IntervalId | null = null;

  private deviceChangeHandler: (() => void) | null = null;

  // eslint-disable-next-line no-restricted-syntax
  constructor(manager: FlexManager) {
    this.manager = manager;
    this.browserInfo = this.detectBrowser();
  }

  public static create(manager: FlexManager): MicrophoneMonitorService {
    return new MicrophoneMonitorService(manager);
  }

  public initialize(): void {
    this.checkDailyReset();

    this.durations.granted = Number(localStorage.getItem(STORAGE_KEYS.GRANTED_TIME) || 0);
    this.durations.denied = Number(localStorage.getItem(STORAGE_KEYS.DENIED_TIME) || 0);

    this.initSessionTracking();
    this.setupGlobalFunctions();
    this.updateGlobalState(Date.now());

    this.setupConnectionEventHandlers();
    this.setupMicrophonePermissionHandler();
    this.setupWorkerActivityHandler();
    this.setupDeviceChangeHandler();

    this.sessionCheckInterval = setInterval(() => {
      if (this.shouldCountTime()) {
        this.updateLastActive();
      }
    }, CONFIG.SESSION_CHECK_INTERVAL);

    console.log('🎤 Microphone monitoring system initialized');
  }

  public cleanup(): void {
    if (this.fallbackCheckInterval) {
      clearInterval(this.fallbackCheckInterval);
      this.fallbackCheckInterval = null;
    }
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }
    if (this.deviceChangeHandler && navigator.mediaDevices && navigator.mediaDevices.removeEventListener) {
      navigator.mediaDevices.removeEventListener('devicechange', this.deviceChangeHandler);
      this.deviceChangeHandler = null;
      console.log('Device change handler removed');
    }
  }

  private detectBrowser(): BrowserInfo {
    const userAgent = navigator.userAgent.toLowerCase();
    const isFirefox = userAgent.includes('firefox');
    const isChrome = userAgent.includes('chrome') && !userAgent.includes('edg');
    const isSafari = userAgent.includes('safari') && !userAgent.includes('chrome');
    const isEdge = userAgent.includes('edg');

    return {
      isFirefox,
      isChrome,
      isSafari,
      isEdge,
      userAgent,
    };
  }

  private isWorkerAvailable(): boolean {
    return this.manager.workerClient?.activity?.name === 'Available';
  }

  private isWorkerOffline(): boolean {
    return this.manager.workerClient?.activity?.name === 'Offline';
  }

  private shouldCountTime(): boolean {
    const sessionData = JSON.parse(sessionStorage.getItem(CONFIG.SESSION_KEY) || '{}') as SessionData;
    return Boolean(sessionData.isOnline) && this.isWorkerAvailable();
  }

  private updateLastActive(): void {
    sessionStorage.setItem(CONFIG.LAST_ACTIVE_KEY, Date.now().toString());
  }

  private saveCurrentDuration(sessionData: SessionData, now: number, reason = ''): boolean {
    const currentState = this.micState;
    if (this.shouldCountTime() && currentState && sessionData.lastStateChange) {
      const elapsed = now - sessionData.lastStateChange;
      if (elapsed > 0 && elapsed < CONFIG.MAX_DAILY_TIME) {
        this.durations[currentState] += elapsed;
        localStorage.setItem(STORAGE_KEYS.GRANTED_TIME, this.durations.granted.toString());
        localStorage.setItem(STORAGE_KEYS.DENIED_TIME, this.durations.denied.toString());

        const message = reason ? `${reason} - saved` : 'Saved';
        console.log(`${message} ${(elapsed / 1000).toFixed(2)}s for ${currentState}`);
        return true;
      }
    }
    return false;
  }

  private updateGlobalState(now: number): void {
    window.__micPermissionState = {
      state: this.micState,
      lastStateChange: now,
      isAvailable: this.isWorkerAvailable(),
      isSessionActive: this.shouldCountTime(),
    };
  }

  private handleOfflineReset(offlineDuration: number): void {
    console.log(
      `Extended Twilio worker offline period detected (${(offlineDuration / 1000 / 3600).toFixed(
        2,
      )} hours) - auto-resetting timer`,
    );

    if (this.durations.granted > 0 || this.durations.denied > 0) {
      const today = getTodayString();
      const timestamp = new Date().toISOString();
      const partialSessionKey = `${STORAGE_KEYS.PARTIAL_PREFIX}${today}_${Date.now()}`;

      localStorage.setItem(
        partialSessionKey,
        JSON.stringify({
          date: today,
          timestamp,
          granted: this.durations.granted,
          denied: this.durations.denied,
          reason: 'auto_reset_worker_offline_4h',
        }),
      );

      console.log(
        `Saved partial session data before reset - Granted: ${(this.durations.granted / 1000 / 3600).toFixed(
          2,
        )}h, Denied: ${(this.durations.denied / 1000 / 3600).toFixed(2)}h`,
      );
    }

    this.durations.granted = 0;
    this.durations.denied = 0;

    localStorage.setItem(STORAGE_KEYS.GRANTED_TIME, '0');
    localStorage.setItem(STORAGE_KEYS.DENIED_TIME, '0');

    localStorage.removeItem(CONFIG.WORKER_OFFLINE_START_KEY);

    this.initSessionTracking();
    console.log(`Timer auto-reset completed due to worker offline duration`);
  }

  private checkDailyReset(): void {
    const today = getTodayString();
    const lastDate = localStorage.getItem(STORAGE_KEYS.LAST_DATE);

    if (lastDate && lastDate !== today) {
      const yesterdayGranted = Number(localStorage.getItem(STORAGE_KEYS.GRANTED_TIME) || 0);
      const yesterdayDenied = Number(localStorage.getItem(STORAGE_KEYS.DENIED_TIME) || 0);

      if (yesterdayGranted > 0 || yesterdayDenied > 0) {
        const historyKey = `${STORAGE_KEYS.HISTORY_PREFIX}${lastDate}`;
        localStorage.setItem(
          historyKey,
          JSON.stringify({
            date: lastDate,
            granted: yesterdayGranted,
            denied: yesterdayDenied,
            total: yesterdayGranted + yesterdayDenied,
          }),
        );

        console.log(
          `Daily reset: Saved ${lastDate} data - Granted: ${(yesterdayGranted / 1000 / 3600).toFixed(2)}h, Denied: ${(
            yesterdayDenied /
            1000 /
            3600
          ).toFixed(2)}h`,
        );
      }

      localStorage.setItem(STORAGE_KEYS.GRANTED_TIME, '0');
      localStorage.setItem(STORAGE_KEYS.DENIED_TIME, '0');
      this.durations.granted = 0;
      this.durations.denied = 0;

      console.log(`Daily reset: Started tracking for ${today}`);
    }

    localStorage.setItem(STORAGE_KEYS.LAST_DATE, today);
  }

  private initSessionTracking(): void {
    const sessionId = Date.now().toString();
    const sessionData: SessionData = {
      sessionId,
      startTime: Date.now(),
      isOnline: navigator.onLine,
      micState: this.micState,
      lastStateChange: Date.now(),
    };

    sessionStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(sessionData));
    console.log(`Session started: ${sessionId} (online: ${sessionData.isOnline})`);
  }

  private static readonly MIC_ATTRIBUTE_KEYS = new Set(['mic', 'micTimestamp', 'micLastChanged']);

  private static readonly ATTRIBUTE_LOAD_RETRY_DELAY_MS = 400;

  private static readonly MAX_ATTRIBUTE_LOAD_RETRIES = 8;

  private async updateWorkerMicAttribute(micStatus: MicStatus, retryCount = 0): Promise<WorkerAttributes> {
    const workerClient = this.manager.workerClient;
    if (!workerClient) {
      console.warn('Worker client not available');
      return Promise.reject(new Error('Worker client not available'));
    }

    const currentAttributes = { ...(workerClient.attributes ?? {}) } as WorkerAttributeUpdate;
    const hasNonMicAttributes = Object.keys(currentAttributes).some(
      (k) => !MicrophoneMonitorService.MIC_ATTRIBUTE_KEYS.has(k),
    );

    // If we only have mic keys or no attributes, we may be racing with attribute load — defer to avoid overwriting
    if (!hasNonMicAttributes && retryCount < MicrophoneMonitorService.MAX_ATTRIBUTE_LOAD_RETRIES) {
      const delay = MicrophoneMonitorService.ATTRIBUTE_LOAD_RETRY_DELAY_MS * (retryCount + 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.updateWorkerMicAttribute(micStatus, retryCount + 1);
    }
    const updatedAttributes: WorkerAttributeUpdate = {
      ...currentAttributes,
      mic: micStatus,
      micTimestamp: Date.now(),
      micLastChanged: new Date().toLocaleString(),
    };

    return workerClient
      .setAttributes(updatedAttributes as WorkerAttributes)
      .then((attributes) => {
        console.log(`Worker attribute updated: mic = ${micStatus}`);
        return attributes;
      })
      .catch((error: unknown) => {
        console.error('Failed to update worker attributes:', error);
        throw error;
      });
  }

  private setupGlobalFunctions(): void {
    window.__resetMicTimer = () => {
      this.durations.granted = 0;
      this.durations.denied = 0;
      localStorage.setItem(STORAGE_KEYS.GRANTED_TIME, '0');
      localStorage.setItem(STORAGE_KEYS.DENIED_TIME, '0');
      localStorage.removeItem(CONFIG.WORKER_OFFLINE_START_KEY);

      if (window.__micPermissionState) {
        window.__micPermissionState.lastStateChange = Date.now();
      }

      console.log('Mic timer manually reset to 00:00:00');
    };

    window.__debugMicTimer = () => {
      console.log('=== Mic Timer Debug Info ===');
      console.log('Global State:', window.__micPermissionState);
      console.log('localStorage granted_time:', localStorage.getItem(STORAGE_KEYS.GRANTED_TIME));
      console.log('localStorage denied_time:', localStorage.getItem(STORAGE_KEYS.DENIED_TIME));
      console.log('In-memory durations:', this.durations);
      console.log('Worker offline start:', localStorage.getItem(CONFIG.WORKER_OFFLINE_START_KEY));
      console.log('Session data:', sessionStorage.getItem(CONFIG.SESSION_KEY));
      console.log('Current time:', Date.now());
      console.log('Worker activity:', this.manager.workerClient?.activity?.name);
      console.log('shouldCountTime():', this.shouldCountTime());

      if (window.__micPermissionState?.lastStateChange) {
        const elapsed = Date.now() - window.__micPermissionState.lastStateChange;
        console.log('Elapsed since last state change:', elapsed, 'ms (', (elapsed / 1000).toFixed(2), 'seconds)');
      }
    };

    window.__updateWorkerMic = async (status: MicStatus) => {
      return this.updateWorkerMicAttribute(status);
    };
  }

  private setupConnectionEventHandlers(): void {
    window.addEventListener('online', () => {
      const sessionData = JSON.parse(sessionStorage.getItem(CONFIG.SESSION_KEY) || '{}') as SessionData;
      const now = Date.now();

      console.log('Internet reconnected');
      sessionData.isOnline = true;
      sessionData.lastStateChange = now;
      sessionStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(sessionData));
      this.updateLastActive();
      this.updateGlobalState(now);
    });

    window.addEventListener('offline', () => {
      const sessionData = JSON.parse(sessionStorage.getItem(CONFIG.SESSION_KEY) || '{}') as SessionData;
      const now = Date.now();

      this.saveCurrentDuration(sessionData, now, 'Internet disconnected');

      console.log('Internet disconnected - pausing timer');
      sessionData.isOnline = false;
      sessionStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(sessionData));

      this.updateGlobalState(now);
      if (window.__micPermissionState) {
        window.__micPermissionState.isSessionActive = false;
      }
    });

    window.addEventListener('beforeunload', () => {
      const now = Date.now();
      const sessionData = JSON.parse(sessionStorage.getItem(CONFIG.SESSION_KEY) || '{}') as SessionData;

      if (this.saveCurrentDuration(sessionData, now, 'Session ending')) {
        console.log('Session ending - saved final durations:', this.durations);
        console.log(
          `Final accumulated granted: ${(this.durations.granted / 1000).toFixed(2)}s, denied: ${(
            this.durations.denied / 1000
          ).toFixed(2)}s`,
        );
      } else {
        console.log('Session ending - no active time to save');
      }
    });
  }

  private async determineMicStatus(permissionState: MicPermissionState | null): Promise<MicStatus> {
    // If permission is not granted, status is Off
    if (permissionState !== 'granted') {
      return 'Off';
    }

    // Even if permission is granted, check if devices are available and enabled
    const deviceCheck = await this.checkMicrophoneDevices();

    // If no devices exist or all devices are disabled, status is Off
    if (!deviceCheck.hasDevices || !deviceCheck.hasEnabledDevices) {
      console.log('Permission granted but no available/enabled microphone devices - setting status to OFF');
      return 'Off';
    }

    return 'On';
  }

  private setupMicrophonePermissionHandler(): void {
    if (!navigator.permissions || !navigator.permissions.query) {
      console.warn('Permissions API not supported in this browser. Using fallback method for microphone detection.');
      this.setupFallbackMicrophoneHandler();
      return;
    }

    if (this.browserInfo.isFirefox) {
      console.log('Firefox detected - using enhanced compatibility mode for microphone permissions');
    }

    const permissionDescriptor = { name: 'microphone' } as MicrophonePermissionDescriptor;

    navigator.permissions
      .query(permissionDescriptor)
      .then(async (permissionStatus) => {
        this.micState = permissionStatus.state;
        this.lastStateChangeTime = Date.now();

        this.updateGlobalState(this.lastStateChangeTime);

        const sessionData = JSON.parse(sessionStorage.getItem(CONFIG.SESSION_KEY) || '{}') as SessionData;
        sessionData.micState = this.micState;
        sessionData.lastStateChange = this.lastStateChangeTime;
        sessionStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(sessionData));

        const initialMicStatus: MicStatus = await this.determineMicStatus(this.micState);

        this.updateWorkerMicAttribute(initialMicStatus).catch((error: unknown) => {
          console.error('Failed to set initial worker mic attribute:', error);
        });

        permissionStatus.onchange = async () => {
          const now = Date.now();
          const latestSessionData = JSON.parse(sessionStorage.getItem(CONFIG.SESSION_KEY) || '{}') as SessionData;

          if (this.shouldCountTime()) {
            const elapsed = now - (latestSessionData.lastStateChange ?? now);
            if (this.micState) {
              this.durations[this.micState] += elapsed;
            }
            localStorage.setItem(STORAGE_KEYS.GRANTED_TIME, this.durations.granted.toString());
            localStorage.setItem(STORAGE_KEYS.DENIED_TIME, this.durations.denied.toString());

            console.log(
              `Microphone permission was '${this.micState}' for ${(elapsed / 1000).toFixed(
                2,
              )} seconds (Active Session)`,
            );
            console.log(
              `Accumulated granted: ${(this.durations.granted / 1000).toFixed(2)}s, denied: ${(
                this.durations.denied / 1000
              ).toFixed(2)}s`,
            );
          } else {
            const reasons: string[] = [];
            if (!latestSessionData.isOnline) reasons.push('offline');
            if (!this.isWorkerAvailable()) reasons.push('not available');
            console.log(`Microphone permission changed but session inactive (${reasons.join(', ')})`);
          }

          this.micState = permissionStatus.state;
          this.lastStateChangeTime = now;

          latestSessionData.micState = this.micState;
          latestSessionData.lastStateChange = now;
          sessionStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(latestSessionData));

          const micStatus: MicStatus = await this.determineMicStatus(this.micState);
          this.updateWorkerMicAttribute(micStatus).catch((error: unknown) => {
            console.error('Failed to update worker mic attribute on permission change:', error);
          });

          this.updateGlobalState(this.lastStateChangeTime);
        };
      })
      .catch((error: unknown) => {
        console.warn('Failed to query microphone permission:', error);
        console.log('Falling back to alternative microphone detection method.');
        this.setupFallbackMicrophoneHandler();
      });
  }

  private setupFallbackMicrophoneHandler(): void {
    const browserName = this.browserInfo.isFirefox
      ? 'Firefox'
      : this.browserInfo.isChrome
        ? 'Chrome'
        : this.browserInfo.isSafari
          ? 'Safari'
          : this.browserInfo.isEdge
            ? 'Edge'
            : 'Unknown';

    console.log(`Setting up fallback microphone permission handler for ${browserName} compatibility`);

    this.micState = 'prompt';
    this.lastStateChangeTime = Date.now();

    this.detectMicrophoneAccess().then(async (hasAccess) => {
      this.micState = hasAccess ? 'granted' : 'denied';
      this.lastStateChangeTime = Date.now();

      this.updateGlobalState(this.lastStateChangeTime);

      const sessionData = JSON.parse(sessionStorage.getItem(CONFIG.SESSION_KEY) || '{}') as SessionData;
      sessionData.micState = this.micState;
      sessionData.lastStateChange = this.lastStateChangeTime;
      sessionStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(sessionData));

      const micStatus: MicStatus = await this.determineMicStatus(this.micState);
      this.updateWorkerMicAttribute(micStatus).catch((error: unknown) => {
        console.error('Failed to set initial worker mic attribute:', error);
      });

      console.log(`Fallback microphone detection (${browserName}): ${this.micState}, status: ${micStatus}`);
    });

    const checkInterval = this.browserInfo.isFirefox ? 3000 : 5000;
    this.fallbackCheckInterval = setInterval(() => {
      this.detectMicrophoneAccess().then(async (hasAccess) => {
        const newState: MicPermissionState = hasAccess ? 'granted' : 'denied';
        if (newState !== this.micState) {
          const now = Date.now();
          const sessionData = JSON.parse(sessionStorage.getItem(CONFIG.SESSION_KEY) || '{}') as SessionData;
          const previousState = this.micState;

          if (this.shouldCountTime() && previousState && sessionData.lastStateChange) {
            const elapsed = now - sessionData.lastStateChange;
            if (elapsed > 0 && elapsed < CONFIG.MAX_DAILY_TIME) {
              this.durations[previousState] += elapsed;
              localStorage.setItem(STORAGE_KEYS.GRANTED_TIME, this.durations.granted.toString());
              localStorage.setItem(STORAGE_KEYS.DENIED_TIME, this.durations.denied.toString());

              console.log(
                `Microphone permission was '${previousState}' for ${(elapsed / 1000).toFixed(
                  2,
                )} seconds (${browserName} Fallback)`,
              );
            }
          }

          this.micState = newState;
          this.lastStateChangeTime = now;

          sessionData.micState = this.micState;
          sessionData.lastStateChange = now;
          sessionStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(sessionData));

          const micStatus: MicStatus = await this.determineMicStatus(this.micState);
          this.updateWorkerMicAttribute(micStatus).catch((error: unknown) => {
            console.error('Failed to update worker mic attribute on permission change:', error);
          });

          this.updateGlobalState(this.lastStateChangeTime);
          console.log(
            `Microphone permission changed to: ${this.micState}, status: ${micStatus} (${browserName} Fallback)`,
          );
        }
      });
    }, checkInterval);
  }

  private async checkMicrophoneDevices(): Promise<{
    hasDevices: boolean;
    hasEnabledDevices: boolean;
    deviceCount: number;
  }> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        console.warn('enumerateDevices not supported');
        return { hasDevices: false, hasEnabledDevices: false, deviceCount: 0 };
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputDevices = devices.filter((device) => device.kind === 'audioinput');

      // Devices with labels are accessible (permission granted and device enabled)
      // Devices without labels may exist but are not accessible (permission denied or device disabled)
      const enabledDevices = audioInputDevices.filter((device) => device.label && device.label.trim() !== '');

      const result = {
        hasDevices: audioInputDevices.length > 0,
        hasEnabledDevices: enabledDevices.length > 0,
        deviceCount: audioInputDevices.length,
      };

      console.log(`Microphone devices check: ${result.deviceCount} total, ${enabledDevices.length} enabled`);
      if (enabledDevices.length > 0) {
        console.log('Enabled devices:', enabledDevices.map((d) => d.label || d.deviceId).join(', '));
      }

      return result;
    } catch (error: unknown) {
      console.error('Error checking microphone devices:', error);
      return { hasDevices: false, hasEnabledDevices: false, deviceCount: 0 };
    }
  }

  private async detectMicrophoneAccess(): Promise<boolean> {
    return new Promise(async (resolve) => {
      // First check if devices are available and enabled
      const deviceCheck = await this.checkMicrophoneDevices();

      // If no devices exist or all devices are disabled, return false
      if (!deviceCheck.hasDevices || !deviceCheck.hasEnabledDevices) {
        console.log('No available microphone devices or all devices are disabled');
        resolve(false);
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('getUserMedia not supported');
        resolve(false);
        return;
      }

      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          stream.getTracks().forEach((track) => track.stop());
          resolve(true);
        })
        .catch((error: unknown) => {
          const err = error as { name?: string };
          console.log('Microphone access denied or unavailable:', err?.name ?? 'unknown');
          resolve(false);
        });
    });
  }

  private setupDeviceChangeHandler(): void {
    if (!navigator.mediaDevices || !navigator.mediaDevices.addEventListener) {
      console.warn('MediaDevices API not fully supported - device change detection unavailable');
      return;
    }

    this.deviceChangeHandler = async () => {
      console.log('Microphone device change detected - rechecking device availability');

      // Recheck device availability
      await this.checkMicrophoneDevices();

      // Determine new status based on current permission state and device availability
      const newStatus = await this.determineMicStatus(this.micState);

      // Get current status from worker attributes to compare
      const workerClient = this.manager.workerClient;
      const currentAttributes = (workerClient?.attributes ?? {}) as WorkerAttributeUpdate;
      const currentMicStatus = currentAttributes.mic as MicStatus | undefined;

      // Only update if status has changed
      if (currentMicStatus === newStatus) {
        console.log(`Device change: Microphone status unchanged (${newStatus})`);
        return;
      }

      console.log(`Device change: Microphone status changed from ${currentMicStatus || 'unknown'} to ${newStatus}`);

      const now = Date.now();
      const sessionData = JSON.parse(sessionStorage.getItem(CONFIG.SESSION_KEY) || '{}') as SessionData;

      // Save current duration if session is active
      if (this.shouldCountTime() && this.micState && sessionData.lastStateChange) {
        const elapsed = now - sessionData.lastStateChange;
        if (elapsed > 0 && elapsed < CONFIG.MAX_DAILY_TIME) {
          this.durations[this.micState] += elapsed;
          localStorage.setItem(STORAGE_KEYS.GRANTED_TIME, this.durations.granted.toString());
          localStorage.setItem(STORAGE_KEYS.DENIED_TIME, this.durations.denied.toString());
          console.log(`Saved ${(elapsed / 1000).toFixed(2)}s for ${this.micState} before device change`);
        }
      }

      // Update state and worker attribute
      sessionData.lastStateChange = now;
      sessionStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(sessionData));
      this.lastStateChangeTime = now;

      this.updateWorkerMicAttribute(newStatus).catch((error: unknown) => {
        console.error('Failed to update worker mic attribute on device change:', error);
      });

      this.updateGlobalState(now);
    };

    navigator.mediaDevices.addEventListener('devicechange', this.deviceChangeHandler);
    console.log('Device change handler registered');
  }

  private setupWorkerActivityHandler(): void {
    const workerClient = this.manager.workerClient;
    if (!workerClient) {
      return;
    }

    workerClient.on('activityUpdated', () => {
      const now = Date.now();
      const sessionData = JSON.parse(sessionStorage.getItem(CONFIG.SESSION_KEY) || '{}') as SessionData;

      const wasAvailable = window.__micPermissionState?.isAvailable;
      const wasSessionActive = window.__micPermissionState?.isSessionActive;
      const isNowAvailable = this.isWorkerAvailable();
      const isNowOffline = this.isWorkerOffline();
      const currentActivity = workerClient.activity?.name ?? 'Unknown';

      console.log(
        `Activity changing from ${wasAvailable ? 'Available' : 'Not Available'} to ${isNowAvailable ? 'Available' : 'Not Available'
        } (${currentActivity})`,
      );

      const currentMicState = this.micState;
      if (wasSessionActive && currentMicState && sessionData.lastStateChange) {
        const elapsed = now - sessionData.lastStateChange;
        if (elapsed > 0 && elapsed < CONFIG.MAX_DAILY_TIME) {
          this.durations[currentMicState] += elapsed;
          localStorage.setItem(STORAGE_KEYS.GRANTED_TIME, this.durations.granted.toString());
          localStorage.setItem(STORAGE_KEYS.DENIED_TIME, this.durations.denied.toString());
          console.log(
            `Saved ${(elapsed / 1000).toFixed(2)}s for ${currentMicState} before status change to ${currentActivity}`,
          );
          console.log(
            `New totals - Granted: ${(this.durations.granted / 1000).toFixed(2)}s, Denied: ${(
              this.durations.denied / 1000
            ).toFixed(2)}s`,
          );
        }
      }

      if (isNowOffline && !localStorage.getItem(CONFIG.WORKER_OFFLINE_START_KEY)) {
        localStorage.setItem(CONFIG.WORKER_OFFLINE_START_KEY, now.toString());
        console.log(`Worker went offline - starting offline timer at ${new Date(now).toLocaleString()}`);
      }

      if (!isNowOffline && localStorage.getItem(CONFIG.WORKER_OFFLINE_START_KEY)) {
        const offlineStartTime = Number(localStorage.getItem(CONFIG.WORKER_OFFLINE_START_KEY));
        const offlineDuration = now - offlineStartTime;

        console.log(`Worker returned from offline after ${(offlineDuration / 1000 / 3600).toFixed(2)} hours`);

        if (offlineDuration > CONFIG.OFFLINE_RESET_THRESHOLD) {
          this.handleOfflineReset(offlineDuration);
        } else {
          localStorage.removeItem(CONFIG.WORKER_OFFLINE_START_KEY);
          console.log(`Worker back online - resuming normal tracking`);
        }
      }

      if (wasAvailable !== isNowAvailable && !isNowOffline) {
        if (wasAvailable && !isNowAvailable) {
          console.log(`Worker became unavailable (${currentActivity}) - time already saved above`);
        } else if (!wasAvailable && isNowAvailable) {
          console.log(
            `Worker became available (${currentActivity}) - timer ${this.shouldCountTime() ? 'resumed' : 'ready to resume'
            } for ${this.micState}`,
          );
        }
      }

      sessionData.lastStateChange = now;
      sessionStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(sessionData));

      const newSessionActive = Boolean(sessionData.isOnline) && isNowAvailable;
      window.__micPermissionState = {
        state: this.micState,
        lastStateChange: now,
        isAvailable: isNowAvailable,
        isSessionActive: newSessionActive,
      };

      console.log(
        `Activity updated: ${currentActivity} (Available: ${isNowAvailable}, Offline: ${isNowOffline}, Session Active: ${newSessionActive})`,
      );
      console.log(
        `Current durations - Granted: ${(this.durations.granted / 1000).toFixed(2)}s, Denied: ${(
          this.durations.denied / 1000
        ).toFixed(2)}s`,
      );
    });
  }
}

export { MicrophoneMonitorService, CONFIG, STORAGE_KEYS };
