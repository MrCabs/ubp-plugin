import { Template, templates } from '@twilio/flex-ui';
import { useUID } from '@twilio-paste/core/uid-library';
import { useTabState, Tab, Tabs, TabList, TabPanel, TabPanels } from '@twilio-paste/core/tabs';
import { Box } from '@twilio-paste/core/box';
import { Heading } from '@twilio-paste/core/heading';
import { useToaster, Toaster } from '@twilio-paste/core/toast';

import { StringTemplates } from '../../flex-hooks/strings';
import AgentAutomationTab from './Tabs/AgentAutomation';
import AudioAdvisoryTab from './Tabs/AudioAdvisoryTab';
import IvrSetting from './Tabs/IvrControlSetting';

const SupervisorSettings = () => {
  const randomComponentId = useUID();
  const { ...tabState } = useTabState();
  const toaster = useToaster();

  const toasterSuccessNotification = (message: string) => {
    toaster.push({
      message,
      variant: 'success',
      dismissAfter: 6000,
    });
  };

  return (
    <Box overflow="auto" padding="space80" width="100%">
      <Heading as="h1" variant="heading10">
        <Template source={templates[StringTemplates.SupervisorSettingsTitle]} />
      </Heading>

      <Tabs selectedId={randomComponentId} baseId="settings" orientation="vertical" state={tabState}>
        <TabList aria-label="Supervisor Settings">
          <Tab>IVR Control Settings</Tab>
          <Tab>IVR Advisory</Tab>
          <Tab id={randomComponentId}>Agent Automation</Tab>
          <Toaster {...toaster} />
        </TabList>
        <TabPanels>
          <TabPanel>
            <Heading as="h3" variant="heading30">
              IVR Control
            </Heading>
            <IvrSetting toasterSuccessNotification={toasterSuccessNotification} />
          </TabPanel>
          <TabPanel>
            <Heading as="h3" variant="heading30">
              Audio Advisory Settings
            </Heading>
            <AudioAdvisoryTab />
          </TabPanel>
          <TabPanel>
            <Heading as="h3" variant="heading30">
              Agent Automation Settings
            </Heading>
            <AgentAutomationTab toasterSuccessNotification={toasterSuccessNotification} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default SupervisorSettings;
