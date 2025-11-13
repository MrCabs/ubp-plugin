import React from 'react';
import { Badge, Box } from '@twilio-paste/core';
import type { WorkerAttributes } from '@twilio/flex-ui';
import { getBusinessUnit } from '../config';

interface MicEnabledWorkerAttributes extends WorkerAttributes {
  mic?: string;
  micLastChanged?: string;
  business_unit: string;
}

interface MicStatusColumnProps {
  worker?: {
    attributes?: MicEnabledWorkerAttributes;
  };
}

const getStatusConfig = (micStatus?: string) => {
  const normalizedStatus = micStatus?.toLowerCase();
  switch (normalizedStatus) {
    case 'on':
      return { text: 'ON', variant: 'success' as const };
    case 'off':
      return { text: 'OFF', variant: 'error' as const };
    default:
      return { text: 'No Data', variant: 'neutral' as const };
  }
};

const MicStatusColumn: React.FC<MicStatusColumnProps> = ({ worker }) => {
  const attributes = (worker?.attributes ?? {}) as MicEnabledWorkerAttributes;

  const business_units = getBusinessUnit()

  if (!business_units.includes(attributes.business_unit)) {
    return null;
  }

  const micStatus = attributes.mic;
  const micLastChanged = attributes.micLastChanged;

  if (!micStatus || !micLastChanged) {
    return (
      <Box padding="space20">
        <Badge as="span" variant="neutral">
          No Data
        </Badge>
      </Box>
    );
  }

  const statusConfig = getStatusConfig(micStatus);

  return (
    <Box padding="space10" minWidth="180px">
      <Badge as="span" variant={statusConfig.variant}>
        {statusConfig.text}
      </Badge>
    </Box>
  );
};

export default MicStatusColumn;

