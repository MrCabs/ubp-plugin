// Export the template strings
export const StringTemplates = {
  CountdownLabel: 'ActivityCountdownTimer.CountdownLabel',
  TimeRemaining: 'ActivityCountdownTimer.TimeRemaining',
};

export const stringHook = () => ({
  [StringTemplates.CountdownLabel]: 'Time Remaining on',
  [StringTemplates.TimeRemaining]: '{{time}}',
});
