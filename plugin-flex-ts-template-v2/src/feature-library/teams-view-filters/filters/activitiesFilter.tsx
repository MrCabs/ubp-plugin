import { FilterDefinition, Manager, FiltersListItemType } from '@twilio/flex-ui';

import { StringTemplates } from '../flex-hooks/strings/TeamViewQueueFilter';
import { getHiddenActivities } from '../config';

const activities = Array.from(Manager.getInstance().store.getState().flex.worker.activities);
const hiddenActivities = getHiddenActivities();

/* 
  This filter exists solely to provide the ability to translate the title,
  as the one included with Flex is only available in English.
  
  Now also supports hiding specific activities based on configuration.
  */

export const activitiesFilter = () =>
  ({
    id: 'data.activity_name',
    title: (Manager.getInstance().strings as any)[StringTemplates.Activities],
    fieldName: 'activity_name',
    options: activities
      ? activities
          .map((activity: any) => ({
            value: activity[1].name,
            label: activity[1].name,
            default: false,
          }))
          .filter((option: any) => !hiddenActivities.includes(option.value))
      : [],
    type: FiltersListItemType.multiValue,
    condition: 'IN',
  } as FilterDefinition);
