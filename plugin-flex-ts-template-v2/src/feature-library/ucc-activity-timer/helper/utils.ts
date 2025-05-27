export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'warning':
      return '#FFCC00';
    case 'exceeded':
      return '#FF5757';
    default:
      return '#4b71f1';
  }
};

export const truncateText = (text: string, maxWidth: number, ctx: CanvasRenderingContext2D): string => {
  let truncated = text;
  while (ctx.measureText(truncated).width > maxWidth && truncated.length > 0) {
    truncated = truncated.slice(0, -1);
  }
  if (truncated !== text) {
    truncated += '...';
  }
  return truncated;
};

export const isPiPSupported = (): boolean => {
  return 'pictureInPictureEnabled' in document;
};
