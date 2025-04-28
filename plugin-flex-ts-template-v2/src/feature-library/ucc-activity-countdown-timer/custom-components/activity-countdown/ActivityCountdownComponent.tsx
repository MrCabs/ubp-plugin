import React, { useEffect, useState, useRef } from 'react';
import { Flex } from '@twilio-paste/core/flex';
import { Tooltip } from '@twilio-paste/core/tooltip';
import { Badge } from '@twilio-paste/core/badge';
import { useSelector } from 'react-redux';

import { selectCountdownState } from '../../flex-hooks/reducers/ActivityCountdownTimer';

// Helper function to format time in MM:SS format
const formatTime = (seconds: number): string => {
  if (seconds <= 0) return '00:00';

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// Helper to determine time-based styling
const getTimeBasedStyling = (timeRemaining: number, totalDuration: number | null) => {
  if (!totalDuration || totalDuration === 0) return { color: 'successIcon' as const, variant: 'success' as const };

  // If less than 25% of time remaining, show red
  if (timeRemaining <= totalDuration * 0.25) {
    return { color: 'errorIcon' as const, variant: 'error' as const };
  }

  // If less than 50% of time remaining, show warning color
  if (timeRemaining <= totalDuration * 0.5) {
    return { color: 'warningIcon' as const, variant: 'warning' as const };
  }

  // Otherwise show normal/success color
  return { color: 'successIcon' as const, variant: 'success' as const };
};

const ActivityCountdownComponent = () => {
  const countdownState = useSelector(selectCountdownState);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const intervalRef = useRef<number | null>(null);

  // Update the countdown every second
  useEffect(() => {
    // Clear any existing interval first to avoid multiple intervals
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!countdownState.isRunning) {
      setTimeRemaining(0);
      return undefined; // Return undefined explicitly to satisfy ESLint
    }

    const calculateTimeRemaining = () => {
      if (!countdownState.startTime || !countdownState.totalDuration) return 0;

      const elapsedTimeMs = Date.now() - countdownState.startTime;
      const elapsedSeconds = Math.floor(elapsedTimeMs / 1000);
      return Math.max(0, countdownState.totalDuration - elapsedSeconds);
    };

    // Initial calculation
    setTimeRemaining(calculateTimeRemaining());

    // Set up the interval
    intervalRef.current = window.setInterval(() => {
      const remaining = calculateTimeRemaining();
      setTimeRemaining(remaining);

      // If countdown reached zero, we can clear the interval
      if (remaining <= 0 && intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, 1000);

    // Cleanup function to satisfy ESLint consistent-return rule
    return function cleanup() {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [countdownState]);

  // Don't render anything if there's no active countdown
  if (!countdownState.isRunning) {
    return null;
  }

  const { variant } = getTimeBasedStyling(timeRemaining, countdownState.totalDuration);

  return (
    <Tooltip text={`Time remaining in ${countdownState.activityName}: ${formatTime(timeRemaining)}`}>
      <Flex hAlignContent="center" vAlignContent="center" margin="space10">
        <Badge as="span" variant={variant}>
          {formatTime(timeRemaining)}
        </Badge>
      </Flex>
    </Tooltip>
  );
};

export default ActivityCountdownComponent;
