export enum StringTemplates {
  MissingBusinessUnit = 'PSMissingBusinessUnit',
}

export const stringHook = () => ({
  'en-US': {
    [StringTemplates.MissingBusinessUnit]: 'Contact your administrator to set up your business unit access.',
  },
});
