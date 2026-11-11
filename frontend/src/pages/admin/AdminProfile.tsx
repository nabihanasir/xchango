import { useState, type FormEvent } from 'react';
import { KeyRound, Mail, Pencil, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../lib/authApi';
import Notice from '../../components/Notice';

const inputClass =
  'w-full rounded-xl border border-light-color/60 bg-white px-4 py-2.5 text-sm font-semibold text-body-text outline-none focus:border-maroon focus:ring-2 focus:ring-maroon/20';
const labelClass = 'text-xs font-bold uppercase tracking-widest text-maroon';
const primaryButton =
  'rounded-xl bg-maroon px-5 py-2.5 text-sm font-bold text-white hover:bg-maroon-hover disabled:opacity-60';
const secondaryButton =
  'rounded-xl border border-light-color/60 px-5 py-2.5 text-sm font-bold text-body-text hover:bg-slate-50';

export default function AdminProfile() {
  const { user, login } = useAuth();

  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [savingName, setSavingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSaveName = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSavingName(true);
    try {
      const updated = await authApi.updateMe({ name });
      if (user) login({ ...user, name: updated.name });
      setEditingName(false);
      setSuccess('Your name has been updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update your name.');
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 8) {
      setError('The new password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('The new password and its confirmation do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword, confirmPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('Your password has been changed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to change your password.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      {error ? <Notice tone="error" onClose={() => setError('')}>{error}</Notice> : null}
      {success ? <Notice tone="success" onClose={() => setSuccess('')}>{success}</Notice> : null}

      <div className="glass-card rounded-[2rem] p-8 shadow-md">
        <div className="mb-8 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-maroon">My Profile</h2>
          {!editingName && (
            <button
              type="button"
              onClick={() => {
                setName(user?.name || '');
                setEditingName(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-maroon px-4 py-2 text-sm font-bold text-white hover:bg-maroon-hover"
            >
              <Pencil className="h-4 w-4" /> Edit name
            </button>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-maroon text-white">
            <User className="h-10 w-10" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-maroon">{user?.name || 'Admin'}</h3>
            <p className="inline-flex items-center gap-1.5 text-body-text">
              <ShieldCheck className="h-4 w-4" /> Super Admin
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3 text-body-text">
          <Mail className="h-5 w-5 text-accent-yellow" />
          <span className="font-semibold">{user?.email || 'Email unavailable'}</span>
        </div>

        {editingName && (
          <form onSubmit={handleSaveName} className="mt-8 space-y-5">
            <label className="block space-y-1.5">
              <span className={labelClass}>Name</span>
              <input
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                required
              />
            </label>
            <div className="flex gap-3">
              <button type="submit" disabled={savingName} className={primaryButton}>
                {savingName ? 'Saving…' : 'Save name'}
              </button>
              <button
                type="button"
                disabled={savingName}
                onClick={() => setEditingName(false)}
                className={secondaryButton}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="glass-card rounded-[2rem] p-8 shadow-md">
        <h2 className="mb-6 inline-flex items-center gap-2 text-2xl font-bold text-maroon">
          <KeyRound className="h-6 w-6" /> Change password
        </h2>
        <form onSubmit={handleChangePassword} className="space-y-5">
          <label className="block space-y-1.5">
            <span className={labelClass}>Current password</span>
            <input
              className={inputClass}
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </label>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <label className="block space-y-1.5">
              <span className={labelClass}>New password</span>
              <input
                className={inputClass}
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </label>
            <label className="block space-y-1.5">
              <span className={labelClass}>Confirm new password</span>
              <input
                className={inputClass}
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </label>
          </div>
          <p className="text-xs font-medium text-slate-500">Use at least 8 characters.</p>
          <button type="submit" disabled={savingPassword} className={primaryButton}>
            {savingPassword ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}
