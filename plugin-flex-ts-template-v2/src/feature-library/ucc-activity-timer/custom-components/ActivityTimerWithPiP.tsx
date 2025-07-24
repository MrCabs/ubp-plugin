import React, { useEffect, useState, useRef, useCallback } from 'react';

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
import ErrorBoundary from './ErrorBoundary';
import PiPErrorBoundary from './PiPErrorBoundary';

interface ResourceTracker {
  animationFrames: Set<number>;
  mediaStreams: Set<MediaStream>;
  eventListeners: Set<{ element: EventTarget; type: string; handler: EventListener }>;
  intervals: Set<NodeJS.Timeout>;
}

const ActivityTimerWithPiP: React.FC<ActivityTimerProps> = () => {
  const [timerData, setTimerData] = useState<TimerDataType | null>(null);
  const [allTimers, setAllTimers] = useState<TimerDataType[]>([]);
  const [showAllTimers, setShowAllTimers] = useState(false);
  const [isPiPActive, setIsPiPActive] = useState(false);
  const [isPiPLoading, setIsPiPLoading] = useState(false);
  const [isPiPSupportedState, setIsPiPSupportedState] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const pipVideoRef = useRef<HTMLVideoElement>(null);
  const pipCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const canvasContext = useRef<CanvasRenderingContext2D | null>(null);
  const canvasDimensions = useRef({ width: 480, height: 360 });
  const canvasContextVersion = useRef(0);

  const latestTimerData = useRef<TimerDataType | null>(null);
  const latestAllTimers = useRef<TimerDataType[]>([]);
  const renderingState = useRef({ isRendering: false, needsUpdate: false });
  const resourceTracker = useRef<ResourceTracker>({
    animationFrames: new Set(),
    mediaStreams: new Set(),
    eventListeners: new Set(),
    intervals: new Set(),
  });

  const cleanupAllResources = useCallback(() => {
    const tracker = resourceTracker.current;

    tracker.animationFrames.forEach((frameId) => {
      cancelAnimationFrame(frameId);
    });
    tracker.animationFrames.clear();

    tracker.mediaStreams.forEach((stream) => {
      stream.getTracks().forEach((track) => track.stop());
    });
    tracker.mediaStreams.clear();

    tracker.eventListeners.forEach(({ element, type, handler }) => {
      element.removeEventListener(type, handler);
    });
    tracker.eventListeners.clear();

    tracker.intervals.forEach((intervalId) => {
      clearInterval(intervalId);
    });
    tracker.intervals.clear();
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const addTrackedEventListener = useCallback(
    (element: EventTarget, type: string, handler: EventListener, options?: boolean | AddEventListenerOptions) => {
      element.addEventListener(type, handler, options);
      resourceTracker.current.eventListeners.add({ element, type, handler });
    },
    [],
  );

  useEffect(() => {
    setIsPiPSupportedState(isPiPSupported());
  }, []);

  useEffect(() => {
    const updateTimers = () => {
      const currentTimerData = ActivityTimerManager.getCurrentTimerData();
      const allTimersData = ActivityTimerManager.getAllTimersData();

      if (currentTimerData) {
        setTimerData(currentTimerData);
      }

      const allTimersDataFiltered = allTimersData || [];
      if (allTimersDataFiltered.length > 0) {
        const sortedTimers = [...allTimersDataFiltered].sort((a, b) => {
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

    return () => {
      clearInterval(interval);
    };
  }, []);

  const getOptimalCanvasDimensions = useCallback(() => {
    const baseWidth = 480;
    const baseHeight = 360;
    const aspectRatio = baseWidth / baseHeight;

    const viewportWidth = window.innerWidth;
    const targetWidth = Math.min(baseWidth, Math.max(200, viewportWidth * 0.2));
    const targetHeight = targetWidth / aspectRatio;
    const finalWidth = Math.max(320, Math.min(600, targetWidth));
    const finalHeight = Math.max(240, Math.min(450, targetHeight));

    return { width: Math.round(finalWidth), height: Math.round(finalHeight) };
  }, []);

  const validateCanvasContext = useCallback(() => {
    if (!pipCanvasRef.current) return null;

    const canvas = pipCanvasRef.current;
    const optimalDimensions = getOptimalCanvasDimensions();

    const dimensionsChanged =
      optimalDimensions.width !== canvasDimensions.current.width ||
      optimalDimensions.height !== canvasDimensions.current.height;

    if (dimensionsChanged || !canvasContext.current || canvas.width !== canvasDimensions.current.width) {
      canvasContext.current = null;
      canvasContextVersion.current += 1;
    }
    if (!canvasContext.current) {
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      canvasDimensions.current = optimalDimensions;
      canvas.width = optimalDimensions.width;
      canvas.height = optimalDimensions.height;

      canvasContext.current = ctx;
    }

    return canvasContext.current;
  }, [getOptimalCanvasDimensions]);

  const renderTimerToCanvas = useCallback(() => {
    if (!pipCanvasRef.current || !timerData) {
      return;
    }

    const ctx = validateCanvasContext();
    if (!ctx) return;

    const { width, height } = canvasDimensions.current;

    if (renderingState.current.isRendering) {
      renderingState.current.needsUpdate = true;
      return;
    }

    renderingState.current.isRendering = true;
    renderingState.current.needsUpdate = false;

    try {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, width, height);

      const statusColor = getStatusColor(timerData.status);

      ctx.save();
      ctx.shadowColor = statusColor;
      ctx.shadowBlur = 15;
      ctx.fillStyle = statusColor;
      ctx.beginPath();
      ctx.arc(width - 30, 30, 10, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px "Segoe UI", -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 2;
      ctx.shadowOffsetY = 1;

      const maxNameWidth = width - 80;
      const displayName = truncateText(timerData.activityName, maxNameWidth, ctx);
      ctx.fillText(displayName, width / 2, 70);
      ctx.restore();

      ctx.save();
      ctx.font = 'bold 32px "Roboto Mono", "Consolas", monospace';
      ctx.fillStyle = statusColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = statusColor;
      ctx.shadowBlur = 6;
      ctx.fillText(timerData.formattedTime, width / 2, 110);
      ctx.restore();
      if (allTimers.length > 1) {
        let yOffset = 170;
        const maxTimers = Math.min(5, allTimers.length - 1);
        let displayedCount = 0;

        const itemGradient = ctx.createLinearGradient(30, 0, width - 30, 25);
        itemGradient.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
        itemGradient.addColorStop(1, 'rgba(255, 255, 255, 0.02)');

        for (let i = 0; i < allTimers.length && displayedCount < maxTimers; i++) {
          const timer = allTimers[i];
          if (timer.activityName === timerData.activityName) continue;

          ctx.save();
          ctx.fillStyle = itemGradient;
          if (ctx.roundRect) {
            ctx.roundRect(30, yOffset - 12, width - 60, 25, 4);
            ctx.fill();
          } else {
            ctx.fillRect(30, yOffset - 12, width - 60, 25);
          }

          const timerStatusColor = getStatusColor(timer.status);
          ctx.shadowColor = timerStatusColor;
          ctx.shadowBlur = 4;
          ctx.fillStyle = timerStatusColor;
          ctx.beginPath();
          ctx.arc(45, yOffset, 3, 0, 2 * Math.PI);
          ctx.fill();

          ctx.shadowBlur = 0;
          ctx.shadowColor = 'transparent';

          ctx.fillStyle = '#e1e3ea';
          ctx.font = '16px "Segoe UI", sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          const maxItemNameWidth = 200;
          const itemDisplayName = truncateText(timer.activityName, maxItemNameWidth, ctx);
          ctx.fillText(itemDisplayName, 55, yOffset);

          ctx.fillStyle = timerStatusColor;
          ctx.font = 'bold 16px "Roboto Mono", monospace';
          ctx.textAlign = 'right';
          ctx.fillText(timer.formattedTime, width - 35, yOffset);

          ctx.restore();

          yOffset += 28;
          displayedCount += 1;
        }

        if (allTimers.length - 1 > maxTimers) {
          ctx.save();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.font = 'italic 14px "Segoe UI", sans-serif';
          ctx.fillText(`+${allTimers.length - 1 - maxTimers} more`, width / 2, yOffset);
          ctx.restore();
        }
      }
    } catch (error) {
      console.error('Canvas rendering error:', error);
    } finally {
      renderingState.current.isRendering = false;

      if (renderingState.current.needsUpdate) {
        requestAnimationFrame(() => renderTimerToCanvas());
      }
    }
  }, [validateCanvasContext, timerData, allTimers]);

  const startPiPAnimation = useCallback(() => {
    let shouldRender = true;
    let lastFrameTime = 0;
    const targetFPS = 30;
    const frameInterval = 1000 / targetFPS;

    const animate = (currentTime: number) => {
      if (!isPiPActive || !shouldRender) return;

      if (currentTime - lastFrameTime >= frameInterval) {
        renderTimerToCanvas();
        lastFrameTime = currentTime;
      }

      const frameId = requestAnimationFrame(animate);
      animationFrameRef.current = frameId;
      resourceTracker.current.animationFrames.add(frameId);
    };

    const initialFrameId = requestAnimationFrame(animate);
    animationFrameRef.current = initialFrameId;
    resourceTracker.current.animationFrames.add(initialFrameId);

    return () => {
      shouldRender = false;
    };
  }, [isPiPActive, renderTimerToCanvas]);

  const stopPiPAnimation = useCallback(() => {
    resourceTracker.current.intervals.forEach((intervalId) => {
      clearTimeout(intervalId);
    });
    resourceTracker.current.intervals.clear();

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    resourceTracker.current.animationFrames.forEach((frameId) => {
      cancelAnimationFrame(frameId);
    });
    resourceTracker.current.animationFrames.clear();
  }, []);

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

  const handlePiPError = useCallback((error: Error) => {
    console.error('PiP Error Boundary triggered:', error);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      resourceTracker.current.mediaStreams.delete(streamRef.current);
      streamRef.current = null;
    }

    setIsPiPActive(false);
  }, []);

  const enterPiP = useCallback(async () => {
    if (!isPiPSupportedState || !pipVideoRef.current || !pipCanvasRef.current) {
      console.warn('PiP not supported or required elements not available');
      return;
    }

    if (isPiPActive || isPiPLoading || document.pictureInPictureElement) {
      console.warn('PiP already active or in progress');
      return;
    }

    setIsPiPLoading(true);

    try {
      const video = pipVideoRef.current;
      const canvas = pipCanvasRef.current;

      const ctx = validateCanvasContext();
      if (!ctx) {
        throw new Error('Canvas context validation failed');
      }

      if (!timerData) {
        throw new Error('No timer data available for PiP');
      }

      renderTimerToCanvas();

      const stream = canvas.captureStream(30); // 30 FPS for smooth updates
      if (!stream || stream.getTracks().length === 0) {
        throw new Error('Failed to capture canvas stream');
      }

      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      video.width = canvasDimensions.current.width;
      video.height = canvasDimensions.current.height;

      streamRef.current = stream;
      resourceTracker.current.mediaStreams.add(stream);

      await video.play();
      await video.requestPictureInPicture();

      setIsPiPActive(true);
    } catch (error) {
      console.error('Failed to enter Picture-in-Picture mode:', error);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        resourceTracker.current.mediaStreams.delete(streamRef.current);
        streamRef.current = null;
      }

      if (pipVideoRef.current) {
        pipVideoRef.current.srcObject = null;
      }

      setIsPiPActive(false);
      throw new Error(`PiP initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsPiPLoading(false);
    }
  }, [isPiPSupportedState, validateCanvasContext, renderTimerToCanvas]);

  const exitPiP = useCallback(async () => {
    if (isPiPLoading) {
      console.warn('PiP operation already in progress');
      return;
    }

    setIsPiPLoading(true);

    try {
      const exitPromise = document.pictureInPictureElement ? document.exitPictureInPicture() : Promise.resolve();

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        resourceTracker.current.mediaStreams.delete(streamRef.current);
        streamRef.current = null;
      }

      await exitPromise;
      setIsPiPActive(false);
    } catch (error) {
      console.error('Failed to exit Picture-in-Picture mode:', error);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        resourceTracker.current.mediaStreams.delete(streamRef.current);
        streamRef.current = null;
      }
      setIsPiPActive(false);
    } finally {
      setIsPiPLoading(false);
    }
  }, [isPiPLoading]);

  const togglePiP = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();

      if (isPiPLoading) {
        console.warn('PiP operation in progress, please wait');
        return;
      }

      if (isPiPActive) {
        exitPiP();
      } else {
        enterPiP();
      }
    },
    [isPiPActive, isPiPLoading, enterPiP, exitPiP],
  );

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
        resourceTracker.current.mediaStreams.delete(streamRef.current);
        streamRef.current = null;
      }
    };

    addTrackedEventListener(video, 'enterpictureinpicture', handleEnterPiP);
    addTrackedEventListener(video, 'leavepictureinpicture', handleLeavePiP);

    return () => {
      video.removeEventListener('enterpictureinpicture', handleEnterPiP);
      video.removeEventListener('leavepictureinpicture', handleLeavePiP);
    };
  }, [addTrackedEventListener]);

  const handleTimerClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAllTimers((prev) => !prev);
  }, []);

  useEffect(() => {
    const handleGlobalClick = (event: Event) => {
      if (!showAllTimers) return;

      const target = event.target as Element;
      const isClickInsideContainer = containerRef.current?.contains(target);
      const isClickInsidePopup = popupRef.current?.contains(target);

      if (!isClickInsideContainer && !isClickInsidePopup) {
        setShowAllTimers(false);
      }
    };

    if (showAllTimers) {
      const timeoutId = setTimeout(() => {
        addTrackedEventListener(document, 'click', handleGlobalClick, true);
      }, 10);
      resourceTracker.current.intervals.add(timeoutId);

      return () => {
        clearTimeout(timeoutId);
        resourceTracker.current.intervals.delete(timeoutId);
        document.removeEventListener('click', handleGlobalClick, true);
      };
    }

    return () => {
      document.removeEventListener('click', handleGlobalClick, true);
    };
  }, [showAllTimers, addTrackedEventListener]);

  useEffect(() => {
    return () => {
      cleanupAllResources();
      stopPiPAnimation();
      canvasContext.current = null;
    };
  }, [cleanupAllResources, stopPiPAnimation]);

  if (!timerData) {
    return null;
  }

  return (
    <ErrorBoundary
      fallback={
        <div style={{ padding: '8px', fontSize: '12px', color: '#666' }}>⚠️ Activity timer temporarily unavailable</div>
      }
    >
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
              <PiPErrorBoundary onPiPError={handlePiPError}>
                <PiPButton
                  isPiPActive={isPiPActive}
                  onClick={togglePiP}
                  title={
                    isPiPLoading
                      ? 'PiP Loading...'
                      : isPiPActive
                      ? 'Exit Picture-in-Picture'
                      : 'Enter Picture-in-Picture'
                  }
                  aria-pressed={isPiPActive}
                  disabled={isPiPLoading}
                >
                  {isPiPActive ? <ExitPiPIcon /> : <PiPIcon />}
                  {isPiPLoading ? 'Loading...' : isPiPActive ? 'Exit PiP' : 'PiP Mode'}
                </PiPButton>
              </PiPErrorBoundary>
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

      {/* PiP-related elements wrapped in error boundary */}
      <PiPErrorBoundary onPiPError={handlePiPError}>
        <PiPVideo ref={pipVideoRef} muted playsInline aria-hidden="true" />
        <canvas ref={pipCanvasRef} style={{ display: 'none' }} width="480" height="360" aria-hidden="true" />
      </PiPErrorBoundary>
    </ErrorBoundary>
  );
};

export default ActivityTimerWithPiP;
