import { useState, useEffect } from 'react';

export const useBreakpoint = () => {
  const useMediaQuery = (query: string) => {
    const [matches, setMatches] = useState(() => {
      if (typeof window === 'undefined') return false;
      return window.matchMedia(query).matches;
    });

    useEffect(() => {
      if (typeof window === 'undefined') return undefined;
      const media = window.matchMedia(query);
      setMatches(media.matches);
      const listener = (event: MediaQueryListEvent) => setMatches(event.matches);
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }, [query]);

    return matches;
  };

  const isMobile = useMediaQuery('(max-width: 575px)');
  const isTablet = useMediaQuery('(min-width: 576px) and (max-width: 991px)');
  const isDesktop = useMediaQuery('(min-width: 992px)');

  return { isMobile, isTablet, isDesktop };
};
