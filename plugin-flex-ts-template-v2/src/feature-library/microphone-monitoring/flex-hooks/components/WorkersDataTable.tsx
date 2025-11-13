import React from 'react';
import * as Flex from '@twilio/flex-ui';

import { FlexComponent } from '../../../../types/feature-loader';
import { isFeatureEnabled } from '../../config';
import MicStatusColumn from '../../custom-components/WorkersDataTable';
import { getBusinessUnit } from '../../config';

const MIC_STATUS_COLUMN_KEY = 'mic-status-column';

export const componentName = FlexComponent.WorkersDataTable;
export const componentHook = function addMicStatusColumn(flex: typeof Flex, manager: Flex.Manager) {
  if (!isFeatureEnabled()) {
    return;
  }
  
  const business_units = getBusinessUnit()

  //flex.WorkersDataTable.Content.remove(MIC_STATUS_COLUMN_KEY);

  const workerAttributes = (manager.workerClient?.attributes ?? {}) as { business_unit: string };
  if (!business_units.includes(workerAttributes.business_unit)) {
    return;
  }

  flex.WorkersDataTable.Content.add(
    <Flex.ColumnDefinition
      key={MIC_STATUS_COLUMN_KEY}
      header="Mic Status"
      content={(item: any) => <MicStatusColumn worker={item.worker} />}
      sortingFn={() => {return 1}}
    />,
    { sortOrder: 99 },
  );
};

