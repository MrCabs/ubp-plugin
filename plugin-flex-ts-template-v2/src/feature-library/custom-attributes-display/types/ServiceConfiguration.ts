export default interface CustomAttributesDisplayConfig {
  enabled: boolean;
  display_options?: {
    defaultSeverity?: 'error' | 'warning' | 'neutral';
  };
}

export interface DisplayElement {
  type: 'error' | 'card' | 'list' | 'notification';
  attributes: {
    [key: string]: any;
    title?: string;
    message?: string;
    code?: string;
    items?: string[];
    timestamp?: string;
  };
  options: {
    [key: string]: any;
    dismissible?: boolean;
    autoDismiss?: boolean;
    severity?: 'error' | 'warning' | 'neutral';
  };
}

export type DisplayConfig = DisplayElement[];
