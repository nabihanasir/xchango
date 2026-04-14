import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { applicationApi } from '../../lib/applicationApi';
import { studentProfileApi } from '../../lib/studentProfileApi';
import ProfileCompletionBlock from '../student/ProfileCompletionBlock';
import type { StudentProfile } from '../../types/studentProfile';
import type { WorkflowApplication } from '../../types/application';

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
      <ProfileCompletionBlock
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

export function RequireInterviewCompleted() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<WorkflowApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?._id) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadApplications = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await applicationApi.getStudentApplications(user._id);
        if (!cancelled) {
          setApplications(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load application status.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadApplications();

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

  const hasInterviewCompleted = applications.some((application) =>
    ['INTERVIEW_COMPLETED', 'COURSE_REQUEST_ENABLED'].includes(application.status)
  );

  if (!hasInterviewCompleted) {
    return (
      <ProfileCompletionBlock
        title="Advisor interview required"
        message="You must complete your advisor interview before requesting course approval."
        actionLabel="Go to Applications"
        actionTo="/dashboard/applications"
      />
    );
  }

  return <Outlet />;
}
