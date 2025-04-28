export default interface ActivityCountdownTimerState {
  activityName: string | null;
  startTime: number | null;
  totalDuration: number | null;
  isRunning: boolean;
}
