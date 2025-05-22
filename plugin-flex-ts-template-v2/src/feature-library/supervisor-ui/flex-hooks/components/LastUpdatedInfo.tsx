import { Box } from '@twilio-paste/core/box';
import { Text } from '@twilio-paste/core/text';

interface LastUpdatedInfoProps {
  lastUpdated: string;
  updatedBy: string | null | undefined;
}

export const LastUpdatedInfo = ({ lastUpdated, updatedBy }: LastUpdatedInfoProps) => (
  <Box marginTop="space40">
    <Text as="p" fontSize="fontSize20" color="colorTextWeak">
      Last updated: {new Date(lastUpdated).toLocaleString()} by {updatedBy}
    </Text>
  </Box>
);
