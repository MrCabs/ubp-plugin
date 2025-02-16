import { Alert } from '@twilio-paste/core/alert';
import { Template, templates } from '@twilio/flex-ui';

export const NoAccessAlert = () => (
  <Alert variant="warning">
    <Template source={templates.NoPermissionError} />
  </Alert>
);
