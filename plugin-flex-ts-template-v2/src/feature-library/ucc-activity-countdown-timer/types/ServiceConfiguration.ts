export interface ActivityDuration {
  duration: number; // Duration in seconds
}

export interface ActivityDurations {
  [activityName: string]: ActivityDuration;
}

export default interface UccActivityCountdownTimerConfig {
  enabled: boolean;
  activity_durations?: ActivityDurations;
}
