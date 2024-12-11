import * as Flex from '@twilio/flex-ui';

import CustomAttributesDisplay from '../../custom-components/CustomAttributesDisplay/CustomAttributesDisplay';
import { FlexComponent } from '../../../../types/feature-loader';

interface TaskProps {
  task?: {
    attributes?: {
      display?: Array<{ type: string; attributes: any; options?: any }> | { type: string };
    };
  };
}

export const componentName = FlexComponent.TaskCanvasHeader;
export const componentHook = function addCustomAttributesDisplay(flex: typeof Flex) {
  // Add error displays at the top
  flex.TaskInfoPanel.Content.add(
    <CustomAttributesDisplay key="custom-attributes-display-error" displayType="error" />,
    {
      sortOrder: -1,
      if: (props: TaskProps) => {
        const display = props.task?.attributes?.display;
        if (!display) return false;

        if (Array.isArray(display)) {
          return display.some((element) => element.type === 'error');
        }
        return display.type === 'error';
      },
    },
  );

  // Add non-error displays below task context
  flex.TaskInfoPanel.Content.add(
    <CustomAttributesDisplay key="custom-attributes-display-normal" displayType="non-error" />,
    {
      sortOrder: 1,
      if: (props: TaskProps) => {
        const display = props.task?.attributes?.display;
        if (!display) return false;

        if (Array.isArray(display)) {
          return display.some((element) => element.type !== 'error');
        }
        return display.type !== 'error';
      },
    },
  );
};
