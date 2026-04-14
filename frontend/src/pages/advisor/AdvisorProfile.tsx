import { useEffect, useState } from 'react';
import { Briefcase, Building, Mail, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { advisorApi, type AdvisorProfileData } from '../../lib/advisorApi';

export default function AdvisorProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<AdvisorProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const data = await advisorApi.getProfile();
        setProfile(data);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load advisor profile.');
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, [user?.token]);

  if (loading) {
    return <div className="glass-card h-64 rounded-[2rem] animate-pulse" />;
  }

  if (error) {
    return (
      <div className="rounded-[2rem] border border-red-200 bg-red-50 px-6 py-5 text-sm font-medium text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="glass-card rounded-[2rem] p-8 shadow-md">
        <h2 className="mb-8 text-2xl font-black text-dark-blue">My Profile</h2>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-dark-blue text-white">
                <User className="h-10 w-10" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-dark-blue">{profile?.userId.name || user?.name || 'Advisor'}</h3>
                <p className="text-body-text">{profile?.designation || 'Advisor'}</p>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-3 text-body-text">
                <Mail className="h-5 w-5 text-accent-yellow" />
                <span className="font-semibold">{profile?.userId.email || user?.email || 'Email unavailable'}</span>
              </div>
              <div className="flex items-center gap-3 text-body-text">
                <Building className="h-5 w-5 text-accent-yellow" />
                <span className="font-semibold">{profile?.department || 'Department not set'}</span>
              </div>
              <div className="flex items-center gap-3 text-body-text">
                <Briefcase className="h-5 w-5 text-accent-yellow" />
                <span className="font-semibold">{profile?.experience ?? 0} Years Experience</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-light-color/50 bg-slate-50 p-6">
            <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-dark-blue">Advisor scope</h4>
            <p className="text-sm leading-relaxed text-body-text">
              Your account can review only applications assigned by an admin and can access only the student profiles connected to those assigned applications.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
