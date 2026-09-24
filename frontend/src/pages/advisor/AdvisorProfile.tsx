import { useEffect, useState, type FormEvent } from 'react';
import { Briefcase, Building, Clock, Mail, Pencil, Phone, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  advisorApi,
  type AdvisorProfileData,
  type AdvisorProfileInput,
} from '../../lib/advisorApi';

const toForm = (profile: AdvisorProfileData | null, fallbackName: string): AdvisorProfileInput => ({
  name: profile?.userId.name || fallbackName,
  designation: profile?.designation || '',
  department: profile?.department || '',
  phone: profile?.phone || '',
  bio: profile?.bio || '',
  officeHours: profile?.officeHours || '',
});

const inputClass =
  'w-full rounded-xl border border-light-color/60 bg-white px-4 py-2.5 text-sm font-semibold text-body-text outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20';

export default function AdvisorProfile() {
  const { user, login } = useAuth();
  const [profile, setProfile] = useState<AdvisorProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<AdvisorProfileInput>(toForm(null, ''));

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

  const startEditing = () => {
    setForm(toForm(profile, user?.name || ''));
    setSaveError('');
    setSaved(false);
    setEditing(true);
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setSaveError('');

    try {
      const updated = await advisorApi.updateProfile(form);
      setProfile(updated);
      if (user && updated.userId.name !== user.name) {
        login({ ...user, name: updated.userId.name });
      }
      setEditing(false);
      setSaved(true);
    } catch (updateError) {
      setSaveError(updateError instanceof Error ? updateError.message : 'Unable to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const setField = (field: keyof AdvisorProfileInput, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

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
        <div className="mb-8 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-black text-emerald-700">My Profile</h2>
          {!editing && (
            <button
              type="button"
              onClick={startEditing}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800"
            >
              <Pencil className="h-4 w-4" /> Edit profile
            </button>
          )}
        </div>

        {saved && !editing && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            Profile updated.
          </div>
        )}

        {editing ? (
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">Name</span>
                <input
                  className={inputClass}
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  maxLength={100}
                  required
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">Email</span>
                <input
                  className={`${inputClass} cursor-not-allowed bg-slate-100`}
                  value={profile?.userId.email || user?.email || ''}
                  readOnly
                  disabled
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">Designation</span>
                <input
                  className={inputClass}
                  value={form.designation}
                  onChange={(e) => setField('designation', e.target.value)}
                  maxLength={100}
                  required
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">Department</span>
                <input
                  className={inputClass}
                  value={form.department}
                  onChange={(e) => setField('department', e.target.value)}
                  maxLength={100}
                  required
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">Phone</span>
                <input
                  className={inputClass}
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setField('phone', e.target.value)}
                  maxLength={30}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">Office hours</span>
                <input
                  className={inputClass}
                  value={form.officeHours}
                  onChange={(e) => setField('officeHours', e.target.value)}
                  maxLength={200}
                  placeholder="e.g. Mon–Thu, 10am–1pm"
                />
              </label>
            </div>
            <label className="block space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">Bio</span>
              <textarea
                className={`${inputClass} min-h-28`}
                value={form.bio}
                onChange={(e) => setField('bio', e.target.value)}
                maxLength={1000}
              />
            </label>

            {saveError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {saveError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => setEditing(false)}
                className="rounded-xl border border-light-color/60 px-5 py-2.5 text-sm font-bold text-body-text hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-700 text-white">
                  <User className="h-10 w-10" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-emerald-700">{profile?.userId.name || user?.name || 'Advisor'}</h3>
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
                <div className="flex items-center gap-3 text-body-text">
                  <Phone className="h-5 w-5 text-accent-yellow" />
                  <span className="font-semibold">{profile?.phone || 'Phone not set'}</span>
                </div>
                <div className="flex items-center gap-3 text-body-text">
                  <Clock className="h-5 w-5 text-accent-yellow" />
                  <span className="font-semibold">{profile?.officeHours || 'Office hours not set'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-light-color/50 bg-slate-50 p-6">
                <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-emerald-700">About</h4>
                <p className="whitespace-pre-line text-sm leading-relaxed text-body-text">
                  {profile?.bio || 'No bio added yet.'}
                </p>
              </div>
              <div className="rounded-2xl border border-light-color/50 bg-slate-50 p-6">
                <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-emerald-700">Advisor scope</h4>
                <p className="text-sm leading-relaxed text-body-text">
                  Your account can review only applications assigned by an admin and can access only the student profiles connected to those assigned applications.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
