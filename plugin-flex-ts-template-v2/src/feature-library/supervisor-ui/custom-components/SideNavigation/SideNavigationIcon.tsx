import { SideLink, Actions, Template, templates } from '@twilio/flex-ui';

import { StringTemplates } from '../../flex-hooks/strings';
import { SupervisorIcon, SupervisorIconFilled } from '../../../../icons/Supervisor';

interface SideNavigationProps {
  activeView?: string;
  viewName: string;
}

const SideNavigationIcon = ({ activeView, viewName }: SideNavigationProps) => {
  const navigateHandler = () => {
    Actions.invokeAction('NavigateToView', {
      viewName,
    });
  };

  return (
    <SideLink
      showLabel={true}
      icon={<SupervisorIcon />}
      iconActive={<SupervisorIconFilled />}
      onClick={navigateHandler}
      isActive={activeView === viewName}
      key="SupervisorUI"
    >
      <Template source={templates[StringTemplates.SupervisorSettingsTitle]} />
    </SideLink>
  );
};

export default SideNavigationIcon;
