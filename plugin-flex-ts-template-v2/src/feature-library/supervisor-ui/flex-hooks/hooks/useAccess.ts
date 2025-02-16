import { Manager } from '@twilio/flex-ui';

export const useAccess = () => {
  const userRoles = Manager.getInstance().user?.roles || [];
  return {
    hasAccess: userRoles.some((role) => ['admin', 'supervisor'].includes(role)),
  };
};
