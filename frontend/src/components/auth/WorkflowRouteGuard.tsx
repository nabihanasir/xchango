import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useStudentJourney } from '../../hooks/useStudentJourney';
import { applicationApi } from '../../lib/applicationApi';
import { parseApiError } from '../../lib/errorUtils';
import { buildStudentJourney, type JourneyStepKey } from '../../utils/studentJourney';
import { studentProfileApi } from '../../lib/studentProfileApi';
import LockedStepNotice from '../student/LockedStepNotice';
import type { StudentProfile } from '../../types/studentProfile';

const loadingCard = (
  <div className="glass-card h-56 rounded-[2rem] animate-pulse" />
);

export function RequireProfileComplete() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?._id) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await studentProfileApi.getStudentProfile(user._id);
        if (!cancelled) {
          setProfile(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load student profile.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [user?._id]);

  if (loading) {
    return loadingCard;
  }

  if (error) {
    return (
      <div className="rounded-[2rem] border border-red-200 bg-red-50 px-6 py-5 text-sm font-medium text-red-700">
        {error}
      </div>
    );
  }

  if (!profile?.isProfileComplete) {
    return (
      <LockedStepNotice
        title="Profile completion required"
        message="Your profile is incomplete. Please complete your profile before creating an application."
        actionLabel="Go to Profile Page"
        actionTo="/dashboard/profile"
        issues={profile?.profileCompletionIssues || []}
      />
    );
  }

  return <Outlet />;
}

/** Blocks the new-application form while another application is open or the semester lock applies. */
export function RequireCanStartApplication() {
  const [state, setState] = useState<{ status: 'loading' | 'ok' | 'blocked'; title: string; message: string }>({
    status: 'loading',
    title: '',
    message: '',
  });

  useEffect(() => {
    let cancelled = false;

    applicationApi
      .checkEligibility()
      .then(() => {
        if (!cancelled) setState({ status: 'ok', title: '', message: '' });
      })
      .catch((error) => {
        if (cancelled) return;
        const parsed = parseApiError(error);
        // A refusal for another reason (for example a dropped connection) should not lock the form: the backend
        // still checks again when the application is created.
        if (parsed.code === 'ACTIVE_APPLICATION_EXISTS' || parsed.code === 'APPLICATION_SEMESTER_LOCKED') {
          setState({
            status: 'blocked',
            title: parsed.message,
            message: [parsed.reason, parsed.solution].filter(Boolean).join(' '),
          });
        } else {
          setState({ status: 'ok', title: '', message: '' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === 'loading') {
    return loadingCard;
  }

  if (state.status === 'blocked') {
    return (
      <LockedStepNotice
        title={state.title}
        message={state.message}
        actionLabel="Go to Applications"
        actionTo="/dashboard/applications"
      />
    );
  }

  return <Outlet />;
}

/**
 * Keeps a page closed until every journey step before it is done, using the same rules as the Progress tracker and
 * the backend (journeyGateService). Pass the step the page belongs to.
 */
export function RequireJourneyStep({ step, requireDone = false }: { step: JourneyStepKey; requireDone?: boolean }) {
  const [journey] = useStudentJourney();

  if (!journey) {
    return loadingCard;
  }

  const steps = buildStudentJourney(journey);
  const current = steps.find((item) => item.key === step);
  const blocker = steps.find((item) => item.state === 'stopped');
  // Most pages open when their step is the current one. With `requireDone` the step itself must be finished.
  const open = current?.state === 'done' || (!requireDone && current?.state === 'current');

  if (current && open && !blocker) {
    return <Outlet />;
  }

  // Stopped journeys name the step that stopped them. Otherwise point at the first step still to do.
  const missing = blocker ?? steps.find((item) => item.state !== 'done');
  return (
    <LockedStepNotice
      title={requireDone ? `${current?.title ?? 'A step'} must be completed first` : `${current?.title ?? 'This step'} is not open yet`}
      message={
        blocker
          ? blocker.description
          : missing
            ? `Finish "${missing.title}" first. ${missing.description}`
            : 'It opens once the steps before it are complete.'
      }
      actionLabel={missing ? `Go to ${missing.title}` : 'Go to Dashboard'}
      actionTo={missing?.to ?? '/dashboard'}
    />
  );
}
