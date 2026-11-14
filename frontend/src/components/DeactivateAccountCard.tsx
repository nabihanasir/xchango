import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../lib/authApi';
import Modal from './Modal';

/** "Danger zone" card: lets the signed-in user deactivate their own account after confirming their password. */
export default function DeactivateAccountCard({ allowDelete = false }: { allowDelete?: boolean }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const close = () => {
    if (busy) return;
    setOpen(false);
    setPassword('');
    setError('');
  };

  const closeDelete = () => {
    if (deleteBusy) return;
    setDeleteOpen(false);
    setDeletePassword('');
    setDeleteConfirm('');
    setDeleteError('');
  };

  const confirmDelete = async () => {
    setDeleteBusy(true);
    setDeleteError('');
    try {
      await authApi.deleteAccount(deletePassword, deleteConfirm);
      logout();
      navigate('/', { replace: true });
    } catch (error_) {
      setDeleteError(error_ instanceof Error ? error_.message : 'Unable to delete your account.');
      setDeleteBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      await authApi.deactivateAccount(password);
      logout();
      navigate('/login', { replace: true });
    } catch (deactivateError) {
      setError(deactivateError instanceof Error ? deactivateError.message : 'Unable to deactivate your account.');
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-rose-200 bg-rose-50/60 p-6">
      <h3 className="text-base font-bold text-rose-800">Deactivate account</h3>
      <p className="mt-1 text-sm text-slate-600">
        You’ll be signed out and won’t be able to log in again. Your records are kept, and an administrator can
        reactivate your account if you change your mind.
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 rounded-xl border border-rose-300 bg-white px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-50"
      >
        Deactivate my account…
      </button>

      {allowDelete ? (
        <div className="mt-6 border-t border-rose-200 pt-5">
          <h3 className="text-base font-bold text-rose-800">Delete account permanently</h3>
          <p className="mt-1 text-sm text-slate-600">
            Removes your profile, applications, uploaded documents, transcript, results and messages for good.{' '}
            <strong>This cannot be undone</strong> — if you might come back, deactivate instead.
          </p>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="mt-4 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700"
          >
            Delete my account…
          </button>
        </div>
      ) : null}

      {deleteOpen ? (
        <Modal onClose={closeDelete} locked={deleteBusy} labelledBy="delete-title">
          <div className="space-y-4 p-6">
            <h2 id="delete-title" className="text-xl font-bold text-slate-900">
              Permanently delete your account?
            </h2>
            <p className="text-sm text-slate-600">
              Everything linked to your account is erased immediately and can’t be recovered. Any interview you booked
              is cancelled.
            </p>
            <input
              type="password"
              value={deletePassword}
              onChange={(event) => setDeletePassword(event.target.value)}
              placeholder="Current password"
              autoComplete="current-password"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
            />
            <input
              type="text"
              value={deleteConfirm}
              onChange={(event) => setDeleteConfirm(event.target.value)}
              placeholder="Type DELETE to confirm"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
            />
            {deleteError ? (
              <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                {deleteError}
              </p>
            ) : null}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={closeDelete}
                disabled={deleteBusy}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700"
              >
                Keep my account
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={deleteBusy || !deletePassword || deleteConfirm !== 'DELETE'}
                className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {deleteBusy ? 'Deleting…' : 'Delete forever'}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {open ? (
        <Modal onClose={close} locked={busy} labelledBy="deactivate-title">
          <div className="space-y-4 p-6">
            <h2 id="deactivate-title" className="text-xl font-bold text-slate-900">
              Deactivate your account?
            </h2>
            <p className="text-sm text-slate-600">
              Any pending or confirmed interview will be cancelled. Enter your password to confirm.
            </p>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Current password"
              autoComplete="current-password"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
            />
            {error ? (
              <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                {error}
              </p>
            ) : null}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={close}
                disabled={busy}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700"
              >
                Keep my account
              </button>
              <button
                type="button"
                onClick={() => void confirm()}
                disabled={busy || !password}
                className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {busy ? 'Deactivating…' : 'Deactivate'}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}
