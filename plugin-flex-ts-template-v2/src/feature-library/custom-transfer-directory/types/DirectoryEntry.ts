export interface DirectoryEntry {
  key: string;
  cold_transfer_enabled: boolean;
  warm_transfer_enabled: boolean;
  icon?: () => React.JSX.Element;
  label: string;
  labelComponent?: () => React.JSX.Element;
  address: string;
  tooltip?: string;
  type: 'number' | 'queue' | 'worker';
}

export interface ExternalDirectoryEntry {
  cold_transfer_enabled: boolean;
  warm_transfer_enabled: boolean;
  label: string;
  number: string;
  check_schedule?: {
    enabled: boolean;
    account_sid: string;
    api_key: string;
    api_secret: string;
    environment: string;
    serverless_domain: string;
    schedule_name: string;
  };
}
