import { withTaskContext, ITask, Actions, Manager, useFlexSelector } from '@twilio/flex-ui';
import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';

import { getExternalDirectory, isVoiceXWTEnabled } from '../config';
import { DirectoryEntry } from '../types/DirectoryEntry';
import ScheduleChecker from '../helpers/ScheduleChecker';
import AppState from '../../../types/manager/AppState';
import { reduxNamespace } from '../../../utils/state';
import DirectoryTab, { TransferClickPayload } from './DirectoryTab';

export interface OwnProps {
  task: ITask;
}

const ExternalDirectoryTab = (props: OwnProps) => {
  const [directory, setDirectory] = useState([] as Array<DirectoryEntry>);
  const [isLoading, setIsLoading] = useState(true);

  const workerAttrs = useFlexSelector((state: AppState) => state.flex.worker.attributes);
  const myContactList = useSelector((state: AppState) => state[reduxNamespace]?.contacts?.directory);
  const sharedContactList = useSelector((state: AppState) => state[reduxNamespace]?.contacts?.sharedDirectory);

  // Map the configurable entries to a DirectoryEntry array with schedule checking
  const generateDirectoryEntries = async (): Promise<Array<DirectoryEntry>> => {
    const externalDirectory = getExternalDirectory();

    return Promise.all(
      externalDirectory.map(async (entry) => {
        // Check schedule if enabled
        let isScheduleOpen = true;
        if (entry.check_schedule?.enabled) {
          isScheduleOpen = await ScheduleChecker.checkSchedule(entry);
        }

        return {
          ...entry,
          // Only enable transfers if schedule is open (or no schedule check required)
          cold_transfer_enabled: entry.cold_transfer_enabled && isScheduleOpen,
          warm_transfer_enabled: entry.warm_transfer_enabled && isVoiceXWTEnabled() && isScheduleOpen,
          address: entry.number,
          tooltip: entry.number,
          type: 'number',
          key: uuidv4(),
        } as DirectoryEntry;
      }),
    );
  };

  // Map the contacts directory entries to a DirectoryEntry array
  const generateContactsEntries = (shared: boolean): Array<DirectoryEntry> => {
    return (
      (shared ? sharedContactList : myContactList)
        ?.map(
          (entry: any) =>
            ({
              cold_transfer_enabled: shared ? entry.allowColdTransfer ?? true : true,
              warm_transfer_enabled: isVoiceXWTEnabled() && shared ? entry.allowWarmTransfer ?? true : true,
              label: entry.name,
              address: entry.phoneNumber,
              tooltip: entry.phoneNumber,
              type: 'number',
              key: uuidv4(),
            } as DirectoryEntry),
        )
        ?.filter((entry: DirectoryEntry) => entry.cold_transfer_enabled || entry.warm_transfer_enabled) ?? [] // Return an empty array if the contacts feature is disabled
    );
  };

  useEffect(() => {
    const loadDirectory = async () => {
      setIsLoading(true);
      try {
        // Get directory entries with schedule checks
        const externalEntries = await generateDirectoryEntries();

        // Combine and sort all entries
        const allEntries = externalEntries
          .concat(generateContactsEntries(false))
          .concat(generateContactsEntries(true))
          .sort((a: DirectoryEntry, b: DirectoryEntry) => (a.label.toLowerCase() > b.label.toLowerCase() ? 1 : -1));

        setDirectory(allEntries);
      } catch (error) {
        console.error('Error loading directory with schedule checks:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDirectory();
  }, [myContactList, sharedContactList]);

  const onTransferEntryClick = (entry: DirectoryEntry, transferOptions: TransferClickPayload) => {
    const defaultFromNumber = Manager.getInstance().serviceConfiguration.outbound_call_flows.default.caller_id;
    const callerId = workerAttrs.phone
      ? workerAttrs.phone
      : workerAttrs.selectedCallerId
      ? workerAttrs.selectedCallerId
      : defaultFromNumber;

    if (transferOptions.mode === 'WARM')
      Actions.invokeAction('StartExternalWarmTransfer', {
        task: props.task,
        phoneNumber: entry.address,
        callerId,
      });
    else if (transferOptions.mode === 'COLD') {
      let from;
      if (
        (props.task?.attributes?.caller && props.task?.attributes?.caller.startsWith('sip')) ||
        (props.task?.attributes?.called && props.task?.attributes?.called.startsWith('sip'))
      ) {
        // If the call we're transferring is a SIP call, override the caller ID
        // Otherwise, do not specify caller ID (uses caller ANI)
        from = callerId;
      }

      Actions.invokeAction('StartExternalColdTransfer', {
        task: props.task,
        phoneNumber: entry.address,
        callerId: from,
      });
    }
  };

  // Add refresh function to reload the directory and recheck schedules
  const refreshDirectory = async () => {
    setIsLoading(true);

    try {
      const externalEntries = await generateDirectoryEntries();

      const allEntries = externalEntries
        .concat(generateContactsEntries(false))
        .concat(generateContactsEntries(true))
        .sort((a: DirectoryEntry, b: DirectoryEntry) => (a.label.toLowerCase() > b.label.toLowerCase() ? 1 : -1));

      setDirectory(allEntries);
    } catch (error) {
      console.error('Error refreshing directory:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DirectoryTab
      entries={directory}
      isLoading={isLoading}
      onTransferClick={onTransferEntryClick}
      onReloadClick={refreshDirectory}
    />
  );
};

export default withTaskContext(ExternalDirectoryTab);
