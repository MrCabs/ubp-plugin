import * as Flex from '@twilio/flex-ui';

export const actionHook = function setHoldTimer(flex: typeof Flex, manager: Flex.Manager) {
  console.log('setHoldMusicBeforeHoldCall hook initiated');

  (window as any).Handlebars.registerHelper('CustomTaskLineCallAssigned', (payload: any) => {
    const task = payload?.data?.root?.task;
    const { status, duration } = getParticipantStatus(task);

    if (duration) {
      return `${status} | ${duration}`;
    }
    return status;
  });

  //   manager.strings.TaskLineCallAssigned = '{{CustomTaskLineCallAssigned}}';
  manager.strings.TaskHeaderStatusAccepted = '{{CustomTaskLineCallAssigned}}';
  manager.strings.SupervisorTaskLive = '{{CustomTaskLineCallAssigned}}';
  manager.strings.TaskHeaderGroupCallAccepted =
    "{{CustomTaskLineCallAssigned}} | {{{icon name='Participant'}}} {{task.conference.liveParticipantCount}}";
  manager.strings.TaskLineGroupCallAssigned =
    "{{CustomTaskLineCallAssigned}} | {{{icon name='Participant'}}} {{task.conference.liveParticipantCount}}";
  manager.strings.SupervisorTaskGroupCall = '{{CustomTaskLineCallAssigned}} | {{task.conference.liveParticipantCount}}';
};

const getCustomerParticipant = (task: Flex.ITask): Flex.ConferenceParticipant | undefined => {
  return task?.conference?.participants?.find((p) => p?.participantType === 'customer');
};

const formatTimeDuration = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  let result;
  if (hours > 0) {
    result = `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    result = `${minutes}m ${seconds % 60}s`;
  } else {
    result = `${seconds}s`;
  }
  return result;
};

const getParticipantStatus = (task: Flex.ITask): { status: string; duration: string } => {
  const customerParticipant = getCustomerParticipant(task);

  const isCustomerOnHold = customerParticipant?.onHold;
  const customerUpdatedTimestamp = customerParticipant?.mediaProperties?.timestamp;

  let timeSinceTaskUpdated;
  if (task?.dateUpdated) {
    timeSinceTaskUpdated = Math.max(Date.now() - task.dateUpdated.getTime(), 0);
  }

  let timeSinceCustomerUpdated;
  if (isCustomerOnHold && customerUpdatedTimestamp) {
    timeSinceCustomerUpdated = Math.max(Date.now() - new Date(customerUpdatedTimestamp).getTime(), 0);
  }

  const status = isCustomerOnHold ? 'Hold' : 'Live';
  let duration = '';

  if (isCustomerOnHold && timeSinceCustomerUpdated) {
    duration = formatTimeDuration(timeSinceCustomerUpdated);
  } else if (!isCustomerOnHold && timeSinceTaskUpdated) {
    duration = formatTimeDuration(timeSinceTaskUpdated);
  }

  return { status, duration };
};
