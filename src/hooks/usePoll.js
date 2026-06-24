import { useEffect, useRef } from 'react';

// Keeps server data fresh without any backend changes. Calls `fn` on a fixed
// interval AND immediately whenever the user returns to the tab, so newly
// added jobs / application status changes show up without a manual reload.
// Polling pauses while the tab is hidden to avoid wasted requests. Callers
// should pass a *silent* refetch (no loading spinner) so the list doesn't
// flicker on every tick.
//
//   usePoll(() => load({ silent: true }), { interval: 20000 });
//
export function usePoll(fn, { interval = 20000, enabled = true } = {}) {
  // Always call the latest closure without re-subscribing every render.
  const saved = useRef(fn);
  useEffect(() => {
    saved.current = fn;
  });

  useEffect(() => {
    if (!enabled) return undefined;

    let timer = null;
    const run = () => {
      if (document.visibilityState === 'visible') saved.current();
    };
    const start = () => {
      if (timer == null) timer = setInterval(run, interval);
    };
    const stop = () => {
      if (timer != null) {
        clearInterval(timer);
        timer = null;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        saved.current(); // refetch right away on return
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', run);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', run);
    };
  }, [interval, enabled]);
}
