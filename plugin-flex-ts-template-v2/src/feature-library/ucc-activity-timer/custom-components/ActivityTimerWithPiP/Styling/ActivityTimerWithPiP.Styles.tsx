import { styled } from '@twilio/flex-ui';

// Timer container styles with improved visual hierarchy
export const TimerContainer = styled('div')<{ status: string }>`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 0 16px;
  height: 100%;
  font-size: 14px;
  font-weight: 500;
  position: relative;
  transition: all 0.3s ease;
  cursor: pointer;
  border-radius: 4px;
  margin: 0 4px;
  min-width: 120px;

  color: ${(props) => {
    switch (props.status) {
      case 'warning':
        return '#FFA726';
      case 'exceeded':
        return '#EF5350';
      default:
        return '#E1E3EA';
    }
  }};

  @media (max-width: 640px) {
    font-size: 12px;
    padding: 0 12px;
  }
`;

export const ActivityName = styled('span')`
  font-size: 12px;
  max-width: 140px;
  white-space: nowrap;
  font-weight: 500;
  opacity: 0.9;
  text-overflow: ellipsis;
  overflow: hidden;
`;

export const TimerValue = styled('span')`
  font-family: 'Roboto Mono', 'Consolas', monospace;
  white-space: nowrap;
  letter-spacing: 0.5px;
  font-weight: 600;
  font-size: 16px;
`;

export const AllTimersPopup = styled('div')`
  position: fixed;
  top: 60px;
  right: 20px;
  background: linear-gradient(145deg, #1e2b45 0%, #192339 100%);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3);
  width: 360px;
  max-width: 90vw;
  z-index: 2147483647;
  padding: 0;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  opacity: 1;
  visibility: visible;
  transition: all 0.2s ease;
  animation: slideIn 0.2s ease-out;

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

export const PopupHeader = styled('div')`
  padding: 8px 10px;
  background: linear-gradient(135deg, #2a3a5a 0%, #273552 100%);
  color: #ffffff;
  font-weight: 600;
  font-size: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  letter-spacing: 0.3px;
`;

export const PiPButton = styled('button')<{ isPiPActive: boolean }>`
  background: ${(props) =>
    props.isPiPActive
      ? 'linear-gradient(135deg, #66BB6A 0%, #4CAF50 100%)'
      : 'linear-gradient(135deg, #5C7CFA 0%, #4B71F1 100%)'};
  color: white;
  border: none;
  border-radius: 8px;
  padding: 6px 8px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    filter: brightness(1.1);
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  &:disabled {
    background: linear-gradient(135deg, #757575 0%, #616161 100%);
    cursor: not-allowed;
    transform: none;
    opacity: 0.7;
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

export const TimerList = styled('div')`
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 320px;
  overflow-y: auto;
  overflow-x: hidden;

  /* Enhanced scrollbar styling */
  &::-webkit-scrollbar {
    width: 10px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(30, 43, 69, 0.5);
    border-radius: 5px;
  }

  &::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, #5c7cfa 0%, #4b71f1 100%);
    border-radius: 5px;
    border: 2px solid transparent;
    background-clip: padding-box;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(180deg, #6b8bff 0%, #5a80ff 100%);
    background-clip: padding-box;
  }
`;

export const TimerEntry = styled('div')<{ status: string }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.3s ease;
`;

export const ActivityLabel = styled('div')<{ status: string }>`
  color: #e1e3ea;
  padding: 0;
  font-size: 14px;
  flex: 1;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
  letter-spacing: 0.2px;
  margin-left: 4px;
`;

export const TimerValuePopup = styled('div')<{ status: string }>`
  padding: 4px 12px;
  font-family: 'Roboto Mono', 'Consolas', monospace;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.5px;
  border-radius: 6px;
  background: ${(props) => {
    switch (props.status) {
      case 'warning':
        return 'rgba(255, 167, 38, 0.15)';
      case 'exceeded':
        return 'rgba(239, 83, 80, 0.15)';
      default:
        return 'rgba(75, 113, 241, 0.1)';
    }
  }};
  color: ${(props) => {
    switch (props.status) {
      case 'warning':
        return '#FFB74D';
      case 'exceeded':
        return '#FF6B6B';
      default:
        return '#5C7CFA';
    }
  }};
`;

const pulseAnimationCSS = `
  &::after {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    border-radius: 50%;
    border: 2px solid #EF5350;
    animation: pulse 1.5s ease-in-out infinite;
    opacity: 0.6;
  }

  @keyframes pulse {
    0% {
      transform: scale(1);
      opacity: 0.6;
    }
    50% {
      transform: scale(1.2);
      opacity: 0.3;
    }
    100% {
      transform: scale(1);
      opacity: 0.6;
    }
  }
`;

export const StatusDot = styled('div')<{ status: string }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 12px;
  position: relative;
  background-color: ${(props) => {
    switch (props.status) {
      case 'warning':
        return '#FFA726';
      case 'exceeded':
        return '#EF5350';
      default:
        return '#66BB6A';
    }
  }};
  box-shadow: ${(props) => {
    switch (props.status) {
      case 'warning':
        return '0 0 8px rgba(255, 167, 38, 0.6)';
      case 'exceeded':
        return '0 0 8px rgba(239, 83, 80, 0.6)';
      default:
        return '0 0 8px rgba(102, 187, 106, 0.6)';
    }
  }};

  ${(props) => (props.status === 'exceeded' ? pulseAnimationCSS : '')}
`;

// PiP video element - this will be used for Picture-in-Picture
export const PiPVideo = styled('video')`
  position: fixed;
  top: -9999px;
  left: -9999px;
  width: 480px;
  height: 360px;
  background: linear-gradient(135deg, #192339 0%, #273552 100%);
  border-radius: 12px;
  z-index: -1;
`;

export const TimerSeparator = styled('span')`
  color: #4a5568;
  margin: 0 8px;
  opacity: 0.5;
  font-weight: 300;
`;

export const EmptyStateMessage = styled('div')`
  padding: 24px;
  text-align: center;
  color: #718096;
  font-size: 14px;
  font-style: italic;
`;

export const TimerCount = styled('span')`
  background: rgba(75, 113, 241, 0.2);
  color: #5c7cfa;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  margin-left: 8px;
`;
