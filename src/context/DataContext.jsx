/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { myApplications } from '../api/applications';
import { usePoll } from '../hooks/usePoll';

// Shared client-side cache for the applicant's own data so that an action in
// one view (e.g. applying from Browse Jobs) is reflected instantly everywhere
// else (Applications list, Dashboard counts, the job's Apply button) without a
// manual page reload. Mounted inside the protected Layout, so it clears on
// logout. No backend changes — this just centralizes the existing fetches.
const DataContext = createContext(null);

const unwrap = (d) => (Array.isArray(d) ? d : d?.results || []);

// An application's job can come back as an id or a nested object.
const jobIdOf = (app) => {
  const j = app?.job;
  return typeof j === 'object' && j ? j.id : j;
};

export function DataProvider({ children }) {
  const [applications, setApplications] = useState([]);
  const [appsLoaded, setAppsLoaded] = useState(false);
  const [appsLoading, setAppsLoading] = useState(false);
  const [appsError, setAppsError] = useState(null);

  // Job ids applied to this session, for instant button feedback even before
  // the background list refetch resolves.
  const [pendingApplied, setPendingApplied] = useState(() => new Set());

  const loadApplications = useCallback(async ({ silent } = {}) => {
    if (!silent) setAppsLoading(true);
    setAppsError(null);
    try {
      const data = await myApplications();
      setApplications(unwrap(data));
      setAppsLoaded(true);
    } catch (err) {
      if (!silent) setAppsError(err);
    } finally {
      if (!silent) setAppsLoading(false);
    }
  }, []);

  // Fetch once on first use; pages call this on mount.
  const ensureApplications = useCallback(() => {
    if (!appsLoaded && !appsLoading) loadApplications();
  }, [appsLoaded, appsLoading, loadApplications]);

  // Keep applied-state live (e.g. applied from another tab) once loaded.
  usePoll(() => loadApplications({ silent: true }), {
    interval: 20000,
    enabled: appsLoaded,
  });

  // Call right after a successful apply: optimistic mark + background refetch.
  const markApplied = useCallback(
    (jobId) => {
      if (jobId != null) {
        setPendingApplied((prev) => new Set(prev).add(String(jobId)));
      }
      loadApplications({ silent: true });
    },
    [loadApplications]
  );

  const appliedJobIds = useMemo(() => {
    const set = new Set(pendingApplied);
    for (const app of applications) {
      const id = jobIdOf(app);
      if (id != null) set.add(String(id));
    }
    return set;
  }, [applications, pendingApplied]);

  const hasAppliedTo = useCallback(
    (jobId) => jobId != null && appliedJobIds.has(String(jobId)),
    [appliedJobIds]
  );

  const value = {
    applications,
    appsLoaded,
    appsLoading,
    appsError,
    loadApplications,
    ensureApplications,
    markApplied,
    hasAppliedTo,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within a DataProvider');
  return ctx;
}
