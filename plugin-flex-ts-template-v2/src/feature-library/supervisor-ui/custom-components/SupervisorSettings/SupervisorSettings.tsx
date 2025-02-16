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
import { isAgentAutomationEnabled, isIvrAdvisoryEnabled, isIvrSettingEnabled } from '../../config';

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

  const tabs = [
    isIvrSettingEnabled() && {
      id: 'ivr-setting',
      label: 'IVR Control Settings',
      component: <IvrSetting toasterSuccessNotification={toasterSuccessNotification} />,
    },
    isIvrAdvisoryEnabled() && {
      id: 'ivr-advisory',
      label: 'IVR Announcement',
      component: <AudioAdvisoryTab toasterSuccessNotification={toasterSuccessNotification} />,
    },
    isAgentAutomationEnabled() && {
      id: 'agent-automation',
      label: 'Flex Agent Automation',
      component: <AgentAutomationTab toasterSuccessNotification={toasterSuccessNotification} />,
    },
  ].filter(Boolean); // Remove any `false` values

  return (
    <Box overflow="auto" padding="space80" width="100%">
      <Heading as="h1" variant="heading10">
        <Template source={templates[StringTemplates.SupervisorSettingsTitle]} />
      </Heading>

      {tabs.length > 0 ? (
        <Tabs selectedId={randomComponentId} baseId="settings" orientation="vertical" state={tabState}>
          <TabList aria-label="Supervisor Settings">
            {tabs.map((tab) => (
              <Tab key={tab.id}>{tab.label}</Tab>
            ))}
            <Toaster {...toaster} />
          </TabList>
          <TabPanels>
            {tabs.map((tab) => (
              <TabPanel key={tab.id}>
                <Heading as="h3" variant="heading30">
                  {tab.label}
                </Heading>
                {tab.component}
              </TabPanel>
            ))}
          </TabPanels>
        </Tabs>
      ) : (
        <Heading as="h3" variant="heading30">
          No available settings.
        </Heading>
      )}
    </Box>
  );
};

export default SupervisorSettings;
