export default interface MicrophoneMonitoringConfig {
  enabled: boolean;
  configuration: {
    business_units: string[];
  };
}
