import { Card } from '@twilio-paste/core/card';
import { Alert } from '@twilio-paste/core/alert';
import { Box } from '@twilio-paste/core/box';

interface ConfigCardProps {
  error?: string | null | undefined;
  children: React.ReactNode;
}

export const ConfigCard = ({ error, children }: ConfigCardProps) => (
  <Box maxWidth="100%">
    <Card padding="space70">
      {error && <Alert variant="error">{error}</Alert>}
      {children}
    </Card>
  </Box>
);
