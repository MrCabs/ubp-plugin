import React, { useEffect, useState, useRef } from 'react';
import { styled } from '@twilio/flex-ui';

import ActivityTimerManager from '../helper/activityTimerManager';

// Styled components for the timer display
const TimerContainer = styled('div')<{ status: string }>`
  display: flex;
  align-items: center;
  padding: 0 12px;
  height: 100%;
  font-size: 14px;
  font-weight: 600;
  position: relative;
  transition: background-color 0.2s ease;

  color: ${(props) => {
    switch (props.status) {
      case 'warning':
        return '#FFCC00'; // Brighter yellow/orange for warning
      case 'exceeded':
        return '#FF5757'; // Brighter red for exceeded
      default:
        return '#E1E3EA'; // Light gray for normal (better for dark theme)
    }
  }};

  &:hover {
    background-color: rgba(75, 113, 241, 0.1);
  }

  @media (max-width: 640px) {
    font-size: 12px;
    padding: 0 8px;
  }
`;

const ActivityName = styled('span')`
  margin-right: 8px;
  white-space: nowrap;
  font-weight: 600;
`;

const TimerValue = styled('span')`
  font-family: 'Roboto Mono', monospace;
  white-space: nowrap;
  letter-spacing: 0.5px;
`;

const AllTimersPopup = styled('div')`
  position: absolute;
  top: calc(100% + 5px);
  right: 0;
  background-color: #192339; // Dark background for dark theme
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  width: 280px;
  z-index: 1000;
  padding: 0;
  overflow: hidden;
  border: 1px solid #2f3b52;
  opacity: 1;
  visibility: visible;
  transition: opacity 0.15s ease, visibility 0.15s ease;
`;

const PopupHeader = styled('div')`
  padding: 12px 16px;
  background-color: #273552; // Darker blue for dark theme
  color: white;
  font-weight: 600;
  font-size: 14px;
  border-bottom: 1px solid #343f5c;
`;

const TimerList = styled('div')`
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 300px;
  overflow-y: auto;

  /* Scrollbar styling for dark theme */
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #1e2b45;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #4b71f1;
    border-radius: 4px;
  }
`;

const TimerEntry = styled('div')<{ status: string }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border-radius: 6px;
  transition: background-color 0.2s ease;
  background-color: #1e2b45;

  &:hover {
    background-color: #273552;
  }
`;

const ActivityLabel = styled('div')<{ status: string }>`
  color: #e1e3ea;
  padding: 0;
  font-size: 14px;
  flex: 1;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
`;

const TimerValuePopup = styled('div')<{ status: string }>`
  padding: 0 10px;
  font-family: 'Roboto Mono', monospace;
  font-size: 14px;
  font-weight: 600;
  color: ${(props) => {
    switch (props.status) {
      case 'warning':
        return '#FFCC00'; // Brighter yellow for warning
      case 'exceeded':
        return '#FF5757'; // Brighter red for exceeded
      default:
        return '#4b71f1'; // Twilio blue for normal
    }
  }};
`;

// Status indicator dot
const StatusDot = styled('div')<{ status: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 10px;
  background-color: ${(props) => {
    switch (props.status) {
      case 'warning':
        return '#FFCC00'; // Yellow for warning
      case 'exceeded':
        return '#FF5757'; // Red for exceeded
      default:
        return '#4CAF50'; // Green for normal
    }
  }};
`;

interface TimerDataType {
  activityName: string;
  formattedTime: string;
  status: 'normal' | 'warning' | 'exceeded';
}

interface ActivityTimerProps {
  theme?: any;
}

const ActivityTimer: React.FC<ActivityTimerProps> = () => {
  const [timerData, setTimerData] = useState<TimerDataType | null>(null);
  const [allTimers, setAllTimers] = useState<TimerDataType[]>([]);
  const [showAllTimers, setShowAllTimers] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Update timer every second with improved status handling
  useEffect(() => {
    const updateTimers = () => {
      // Get the current timer data
      const currentTimerData = ActivityTimerManager.getCurrentTimerData();

      // If we have timer data, use it
      if (currentTimerData) {
        setTimerData(currentTimerData);
      }

      // Get all timers data
      const allTimersData = ActivityTimerManager.getAllTimersData();
      if (allTimersData && allTimersData.length > 0) {
        // Sort timers: exceeded first, then warning, then normal
        const sortedTimers = [...allTimersData].sort((a, b) => {
          const statusPriority = { exceeded: 0, warning: 1, normal: 2 };
          return statusPriority[a.status] - statusPriority[b.status];
        });

        setAllTimers(sortedTimers);

        // If no current timer is set, use the first timer from all timers
        // This ensures we always display something even after activity changes
        if (!currentTimerData && sortedTimers.length > 0) {
          setTimerData(sortedTimers[0]);
        }
      }
    };

    // Force an immediate update on component mount
    updateTimers();

    // Set interval for regular updates
    const interval = setInterval(updateTimers, 1000);

    // Force persistence of timer data
    ActivityTimerManager.persistTimerData();

    return () => clearInterval(interval);
  }, []);

  // [rest of the component remains unchanged]

  if (!timerData) {
    return null;
  }

  return (
    <TimerContainer
      status={timerData.status}
      ref={containerRef}
      onMouseEnter={() => setShowAllTimers(true)}
      onMouseLeave={() => setShowAllTimers(false)}
    >
      <ActivityName>{timerData.activityName}</ActivityName>
      <TimerValue>{timerData.formattedTime}</TimerValue>

      {showAllTimers && allTimers.length > 0 && (
        <AllTimersPopup ref={popupRef}>
          <PopupHeader>Activity Timers</PopupHeader>
          <TimerList>
            {allTimers.map((timer) => (
              <TimerEntry key={timer.activityName} status={timer.status}>
                <StatusDot status={timer.status} />
                <ActivityLabel status={timer.status}>{timer.activityName}</ActivityLabel>
                <TimerValuePopup status={timer.status}>{timer.formattedTime}</TimerValuePopup>
              </TimerEntry>
            ))}
          </TimerList>
        </AllTimersPopup>
      )}
    </TimerContainer>
  );
};

export default ActivityTimer;
