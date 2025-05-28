import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';

import ActivityTimerManager from '../helper/activityTimerManager';
import { PiPIcon, ExitPiPIcon } from './ActivityTimerWithPiP/PIPIcon/ActivityTimerIcons';
import {
  TimerContainer,
  ActivityName,
  TimerValue,
  AllTimersPopup,
  PopupHeader,
  PiPButton,
  TimerList,
  TimerEntry,
  ActivityLabel,
  TimerValuePopup,
  StatusDot,
  PiPVideo,
  EmptyStateMessage,
} from './ActivityTimerWithPiP/Styling/ActivityTimerWithPiP.Styles';
import { getStatusColor, truncateText, isPiPSupported } from '../helper/utils';
import { TimerDataType, ActivityTimerProps } from '../types/ActivityTimer';

const ActivityTimerWithPiP: React.FC<ActivityTimerProps> = () => {
  const [timerData, setTimerData] = useState<TimerDataType | null>(null);
  const [allTimers, setAllTimers] = useState<TimerDataType[]>([]);
  const [showAllTimers, setShowAllTimers] = useState(false);
  const [isPiPActive, setIsPiPActive] = useState(false);
  const [isPiPSupportedState, setIsPiPSupportedState] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const pipVideoRef = useRef<HTMLVideoElement>(null);
  const pipCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    setIsPiPSupportedState(isPiPSupported());
  }, []);

  useEffect(() => {
    const updateTimers = () => {
      const currentTimerData = ActivityTimerManager.getCurrentTimerData();

      if (currentTimerData) {
        setTimerData(currentTimerData);
      }

      const allTimersData = ActivityTimerManager.getAllTimersData();
      if (allTimersData && allTimersData.length > 0) {
        // Sort timers: exceeded first, then warning, then normal
        const sortedTimers = [...allTimersData].sort((a, b) => {
          const statusPriority = { exceeded: 0, warning: 1, normal: 2 };
          return statusPriority[a.status] - statusPriority[b.status];
        });

        setAllTimers(sortedTimers);

        if (!currentTimerData && sortedTimers.length > 0) {
          setTimerData(sortedTimers[0]);
        }
      }
    };

    updateTimers();

    const interval = setInterval(updateTimers, 1000);

    ActivityTimerManager.persistTimerData();

    return () => clearInterval(interval);
  }, []);

  const activeTimersCount = useMemo(() => allTimers.length, [allTimers]);
  const hasMultipleTimers = useMemo(() => activeTimersCount > 1, [activeTimersCount]);

  const renderTimerToCanvas = useCallback(() => {
    if (!pipCanvasRef.current || !timerData) return;

    const canvas = pipCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 480;
    canvas.height = 360;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const statusColor = getStatusColor(timerData.status);
    ctx.shadowColor = statusColor;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(canvas.width - 30, 30, 10, 0, 2 * Math.PI);
    ctx.fillStyle = statusColor;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px "Segoe UI", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetY = 1;

    // Truncate activity name if too long
    const maxNameWidth = canvas.width - 80;
    const displayName = truncateText(timerData.activityName, maxNameWidth, ctx);
    ctx.fillText(displayName, canvas.width / 2, 90);

    ctx.font = 'bold 46px "Roboto Mono", "Consolas", monospace';
    ctx.fillStyle = statusColor;
    // ctx.shadowColor = statusColor;
    ctx.shadowBlur = 8;
    ctx.fillText(timerData.formattedTime, canvas.width / 2, 150);
    ctx.shadowBlur = 0;

    // Draw other timers
    if (allTimers.length > 1) {
      ctx.font = '24px "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      let yOffset = 245;
      const maxTimers = Math.min(3, allTimers.length - 1);
      let displayedCount = 0;

      for (let i = 0; i < allTimers.length && displayedCount < maxTimers; i++) {
        const timer = allTimers[i];
        if (timer.activityName === timerData.activityName) continue;

        // background for timer item
        const itemGradient = ctx.createLinearGradient(30, yOffset - 15, canvas.width - 30, yOffset + 15);
        itemGradient.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
        itemGradient.addColorStop(1, 'rgba(255, 255, 255, 0.02)');
        ctx.fillStyle = itemGradient;
        ctx.roundRect(30, yOffset - 15, canvas.width - 60, 30, 6);
        ctx.fill();

        // Status indicator with glow
        ctx.shadowColor = getStatusColor(timer.status);
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(50, yOffset, 4, 0, 2 * Math.PI);
        ctx.fillStyle = getStatusColor(timer.status);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Timer name
        ctx.fillStyle = '#e1e3ea';
        const maxItemNameWidth = 240;
        const itemDisplayName = truncateText(timer.activityName, maxItemNameWidth, ctx);
        ctx.fillText(itemDisplayName, 65, yOffset);

        // Timer value with background
        ctx.textAlign = 'right';
        ctx.font = 'bold 24px "Roboto Mono", monospace';
        ctx.fillStyle = getStatusColor(timer.status);
        ctx.fillText(timer.formattedTime, canvas.width - 40, yOffset);
        ctx.textAlign = 'left';
        ctx.font = '24px "Segoe UI", sans-serif';

        yOffset += 35;
        displayedCount += 1;
      }

      // Show remaining count if any
      if (allTimers.length - 1 > maxTimers) {
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = 'italic 24px "Segoe UI", sans-serif';
        ctx.fillText(`+${allTimers.length - 1 - maxTimers} more`, canvas.width / 2, yOffset);
      }
    }
  }, [timerData, allTimers]);

  // Animation loop for PiP
  const startPiPAnimation = useCallback(() => {
    const animate = () => {
      if (isPiPActive) {
        renderTimerToCanvas();
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };
    animate();
  }, [isPiPActive, renderTimerToCanvas]);

  const stopPiPAnimation = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Start/stop animation based on PiP state
  useEffect(() => {
    if (isPiPActive) {
      startPiPAnimation();
    } else {
      stopPiPAnimation();
    }

    return () => {
      stopPiPAnimation();
    };
  }, [isPiPActive, startPiPAnimation, stopPiPAnimation]);

  const enterPiP = useCallback(async () => {
    if (!isPiPSupportedState || !pipVideoRef.current || !pipCanvasRef.current) return;

    try {
      // Initial render
      renderTimerToCanvas();

      // Create stream from canvas
      const stream = pipCanvasRef.current.captureStream(30);
      streamRef.current = stream;
      pipVideoRef.current.srcObject = stream;

      // Play the video (required for PiP)
      await pipVideoRef.current.play();

      // Enter Picture-in-Picture mode
      await pipVideoRef.current.requestPictureInPicture();
      setIsPiPActive(true);
    } catch (error) {
      console.error('Failed to enter Picture-in-Picture mode:', error);
    }
  }, [isPiPSupportedState, renderTimerToCanvas]);

  const exitPiP = useCallback(async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      setIsPiPActive(false);
    } catch (error) {
      console.error('Failed to exit Picture-in-Picture mode:', error);
    }
  }, []);

  const togglePiP = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isPiPActive) {
        exitPiP();
      } else {
        enterPiP();
      }
    },
    [isPiPActive, enterPiP, exitPiP],
  );

  // Listen for PiP events
  useEffect(() => {
    const video = pipVideoRef.current;
    if (!video) {
      return () => {
        console.warn('Video element not found for PiP events');
      };
    }

    const handleEnterPiP = () => setIsPiPActive(true);
    const handleLeavePiP = () => {
      setIsPiPActive(false);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };

    video.addEventListener('enterpictureinpicture', handleEnterPiP);
    video.addEventListener('leavepictureinpicture', handleLeavePiP);

    return () => {
      video.removeEventListener('enterpictureinpicture', handleEnterPiP);
      video.removeEventListener('leavepictureinpicture', handleLeavePiP);
    };
  }, []);

  const handleTimerClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAllTimers((prev) => !prev);
  }, []);

  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      if (!showAllTimers) return;

      const target = event.target as Element;
      const isClickInsideContainer = containerRef.current?.contains(target);
      const isClickInsidePopup = popupRef.current?.contains(target);

      if (!isClickInsideContainer && !isClickInsidePopup) {
        setShowAllTimers(false);
      }
    };

    // Use a small delay to ensure the popup is rendered before adding the listener
    if (showAllTimers) {
      const timeoutId = setTimeout(() => {
        document.addEventListener('click', handleGlobalClick, true);
      }, 10);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('click', handleGlobalClick, true);
      };
    }

    return () => {
      document.removeEventListener('click', handleGlobalClick, true);
    };
  }, [showAllTimers]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      stopPiPAnimation();
    };
  }, [stopPiPAnimation]);

  if (!timerData) {
    return null;
  }

  return (
    <>
      <TimerContainer
        status={timerData.status}
        ref={containerRef}
        onClick={handleTimerClick}
        role="timer"
        aria-label={`${timerData.activityName} timer: ${timerData.formattedTime}`}
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        <ActivityName>{timerData.activityName}</ActivityName>
        <TimerValue>{timerData.formattedTime}</TimerValue>
      </TimerContainer>

      {showAllTimers && (
        <AllTimersPopup
          ref={popupRef}
          role="dialog"
          aria-label="All activity timers"
          style={{
            position: 'fixed',
            top: '60px',
            right: '20px',
            zIndex: 2147483647,
            pointerEvents: 'auto',
          }}
        >
          <PopupHeader>
            <span>Activity Timers</span>
            {isPiPSupportedState && (
              <PiPButton
                isPiPActive={isPiPActive}
                onClick={togglePiP}
                title={isPiPActive ? 'Exit Picture-in-Picture' : 'Enter Picture-in-Picture'}
                aria-pressed={isPiPActive}
              >
                {isPiPActive ? <ExitPiPIcon /> : <PiPIcon />}
                {isPiPActive ? 'Exit PiP' : 'PiP Mode'}
              </PiPButton>
            )}
          </PopupHeader>
          <TimerList>
            {allTimers.length > 0 ? (
              allTimers.map((timer) => (
                <TimerEntry
                  key={timer.activityName}
                  status={timer.status}
                  role="listitem"
                  aria-label={`${timer.activityName}: ${timer.formattedTime}, status: ${timer.status}`}
                >
                  <StatusDot status={timer.status} aria-hidden="true" />
                  <ActivityLabel status={timer.status}>{timer.activityName}</ActivityLabel>
                  <TimerValuePopup status={timer.status}>{timer.formattedTime}</TimerValuePopup>
                </TimerEntry>
              ))
            ) : (
              <EmptyStateMessage>No active timers</EmptyStateMessage>
            )}
          </TimerList>
        </AllTimersPopup>
      )}

      <PiPVideo ref={pipVideoRef} muted playsInline aria-hidden="true" />
      <canvas ref={pipCanvasRef} style={{ display: 'none' }} width="480" height="360" aria-hidden="true" />
    </>
  );
};

export default ActivityTimerWithPiP;
