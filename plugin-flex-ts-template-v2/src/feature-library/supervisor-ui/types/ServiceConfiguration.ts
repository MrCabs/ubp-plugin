// Common Types
export default interface SupervisorUiConfig {
  enabled: boolean;
  enable_audit_logging: boolean;
  ivr_advisory: AudioServiceConfig;
  applied_setting: SupervisorUiTabConfig;
}

export interface SupervisorUiTabConfig {
  display_agent_automation: boolean;
  display_ivr_setting: boolean;
  display_ivr_advisory: boolean;
}

export interface AudioServiceConfig {
  audio_key: string;
  audio_service_url: string;
  asset_folder_name: string;
}

export interface SupervisorUiServiceResponse {
  configuration: any;
}

export interface BaseConfig {
  last_updated?: string;
  updated_by?: string;
}

export interface ValidationError {
  [key: string]: string | undefined;
}

export interface ToasterProps {
  toasterSuccessNotification: (message: string) => void;
}

// Agent Types
export interface AgentAutomationConfig extends BaseConfig {
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

// IVR Types
export interface IvrSettingsConfig extends BaseConfig {
  ivr_enabled: boolean;
  bcp_mode: boolean;
}

// Audio Advisory Types
export interface AudioItem extends Omit<BaseConfig, 'last_updated' | 'updated_by'> {
  label: string;
  url: string;
  file_key: string;
  audio_type?: string;
  instance_id: string;
  last_updated: string;
  updated_by: string;
}

// export interface AudioAdvisoryConfig extends BaseConfig {
//   audio_recording_enabled: boolean;
//   message_text?: string;
//   selected_audio_items: AudioItem[];
// }

export interface AudioAdvisoryValidation extends ValidationError {
  message_error?: string;
  selected_audio_error?: string;
}

export interface StoredAudio {
  fileKey: string;
  originalName: string;
  size: number;
  lastModified: Date;
  uploadedBy: string;
  metadata: Record<string, string>;
  signedUrl: string;
}

export interface AudioStorageResponse {
  files: StoredAudio[];
  hasMore: boolean;
  nextContinuationToken: string | null;
  total: number;
}

export interface AudioMetadata {
  originalName: string;
  signedUrl: string;
  fileKey: string;
  uploadedBy: string;
  lastModified: string;
}

export interface PlayableAudio {
  label: string;
  url: string;
  fileKey: string;
  originalName: string;
  uploadedBy: string;
  lastModified: string;
}

export interface AudioAdvisoryConfig extends BaseConfig {
  useAudioRecording: boolean;
  message?: string;
  selectedAudios: {
    label: string;
    url: string;
    uploadedBy: string;
    lastModified: string;
    fileKey: string;
    type?: string;
    instanceId: string;
  }[];
}
