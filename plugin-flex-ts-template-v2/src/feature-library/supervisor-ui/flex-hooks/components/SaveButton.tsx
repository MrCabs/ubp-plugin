import { Button } from '@twilio-paste/core/button';
import { Spinner } from '@twilio-paste/core/spinner';
import { Stack } from '@twilio-paste/core/stack';
import { Text } from '@twilio-paste/core/text';

interface SaveButtonProps {
  isLoading: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export const SaveButton = ({ isLoading, onClick, disabled }: SaveButtonProps) => (
  <Button variant="primary" onClick={onClick} disabled={disabled || isLoading}>
    {isLoading ? (
      <Stack orientation="horizontal" spacing="space30">
        <Spinner decorative={false} title="Saving changes" size="sizeIcon20" />
        <Text as="span">Saving Changes...</Text>
      </Stack>
    ) : (
      'Save Changes'
    )}
  </Button>
);
