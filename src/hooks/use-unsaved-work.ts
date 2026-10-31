import { useEffect } from 'react';

// Only guards locally edited work; does not create records or replace existing saves.
export function useUnsavedWork(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    const follow = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!anchor || anchor.getAttribute('href')?.startsWith('#') || event.defaultPrevented) return;
      if (!window.confirm('Leave this page and discard unsaved work?')) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener('beforeunload', unload);
    document.addEventListener('click', follow, true);
    return () => { window.removeEventListener('beforeunload', unload); document.removeEventListener('click', follow, true); };
  }, [dirty]);
}
