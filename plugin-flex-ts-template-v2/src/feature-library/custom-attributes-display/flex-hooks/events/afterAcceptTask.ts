import * as Flex from '@twilio/flex-ui';

import { FlexEvent } from '../../../../types/feature-loader';
import { getDisplayConfig } from '../../helpers/DisplayHelper';

export const eventName = FlexEvent.taskAccepted;
export const eventHook = function handleAfterAcceptTask(flex: typeof Flex, _manager: Flex.Manager) {
  flex.Actions.addListener('taskAccepted', async (payload) => {
    const { task } = payload;

    // Get the display configuration for this task
    const displayConfig = getDisplayConfig(task);
    if (!displayConfig) return;

    // Only update if the display config has changed
    if (JSON.stringify(task.attributes?.display) !== JSON.stringify(displayConfig)) {
      try {
        await flex.Actions.invokeAction('SetTaskAttributes', {
          task,
          attributes: {
            ...task.attributes,
            display: displayConfig,
          },
        });
      } catch (error) {
        console.error('Error updating task attributes with display config:', error);
      }
    }
  });
};
