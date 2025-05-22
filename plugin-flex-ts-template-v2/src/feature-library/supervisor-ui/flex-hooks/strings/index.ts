// Export the template names as an enum for better maintainability when accessing them elsewhere
export enum StringTemplates {
  ErrorFetchingConfig = 'PSErrorFetchingConfig',
  ErrorUpdatingConfig = 'PSErrorUpdatingConfig',
  SuccessUpdatingConfig = 'PSSuccessUpdatingConfig',
  SupervisorSettingsTitle = 'PSSupervisorSettingsTitle',
}

export const stringHook = () => ({
  'en-US': {
    [StringTemplates.ErrorFetchingConfig]: 'Failed to fetch configuration',
    [StringTemplates.ErrorUpdatingConfig]: 'Failed to update configuration',
    [StringTemplates.SuccessUpdatingConfig]: 'Settings updated successfully',
    [StringTemplates.SupervisorSettingsTitle]: 'Supervisor Settings',
  },
});
