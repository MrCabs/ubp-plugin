export default interface IvrAdvisoryConfig {
  enabled: boolean;
  configuration: AudioAdvisoryConfig;
}

export interface WhoUpdateConfig {
  last_updated: string;
  updated_by: string;
}

export interface AudioAdvisoryConfig extends WhoUpdateConfig {
  useAudioRecording: boolean;
  message: string;
  selectedAudios: {
    label: string;
    url: string;
    uploadedBy: string;
    lastModified: string;
    fileKey: string;
    type: string;
    instanceId: string;
  }[];
}
