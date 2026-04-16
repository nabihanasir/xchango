import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import Button from '../components/Button';
import ErrorAlert from '../components/ErrorAlert';
import InputField from '../components/InputField';
import { useToast } from '../context/ToastContext';
import { authApi } from '../lib/authApi';
import { parseApiError } from '../lib/errorUtils';
import { AppApiError } from '../types/error';

export default function ResetPasswordPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<AppApiError | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const nextFieldErrors: { password?: string; confirmPassword?: string } = {};

    if (!password) {
      nextFieldErrors.password = 'Password is required.';
    } else if (password.length < 8) {
      nextFieldErrors.password = 'Password must be at least 8 characters.';
    }

    if (!confirmPassword) {
      nextFieldErrors.confirmPassword = 'Please confirm your password.';
    } else if (confirmPassword !== password) {
      nextFieldErrors.confirmPassword = 'Passwords do not match.';
    }

    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length) {
      return;
    }

    if (!token) {
      const missingTokenError = new AppApiError({
        code: 'RESET_TOKEN_REQUIRED',
        message: 'Reset link is invalid',
        reason: 'The reset password page was opened without a valid token.',
        solution: 'Request a new password reset link and open it directly.',
        status: 400,
        timestamp: new Date().toISOString(),
        path: '/reset-password',
      });

      setError(missingTokenError);
      return;
    }

    setSubmitting(true);

    try {
      const response = await authApi.resetPassword(token, { password, confirmPassword });
      setSuccessMessage(response.message);
      showToast({
        tone: 'success',
        title: 'Password updated',
        description: response.message,
      });
      window.setTimeout(() => navigate('/login', { replace: true }), 1200);
    } catch (caughtError) {
      const normalizedError = parseApiError(caughtError);
      setError(normalizedError);
      showToast({
        tone: 'error',
        title: normalizedError.message,
        description: normalizedError.solution,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Create New Password" subtitle="Choose a strong password to secure your account">
      <div className="mb-6 rounded-2xl border border-accent-yellow/40 bg-accent-yellow/10 px-4 py-3 text-sm font-medium text-dark-blue">
        Reset links stay active for 15 minutes. Once you save the new password, you&apos;ll be redirected to log in.
      </div>

      <form className="w-full space-y-6" onSubmit={handleSubmit}>
        <InputField
          label="New Password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter your new password"
          icon={<Lock className="h-5 w-5" />}
          rightIcon={showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          onRightIconClick={() => setShowPassword((value) => !value)}
          error={fieldErrors.password}
          required
        />

        <InputField
          label="Confirm Password"
          type={showConfirmPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Re-enter your new password"
          icon={<ShieldCheck className="h-5 w-5" />}
          rightIcon={showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          onRightIconClick={() => setShowConfirmPassword((value) => !value)}
          error={fieldErrors.confirmPassword}
          required
        />

        <Button type="submit" variant="primary" className="mt-6 py-4 text-lg" disabled={submitting}>
          {submitting ? 'Updating Password...' : 'Reset Password'}
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>

        {successMessage ? (
          <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50/90 p-5 text-sm font-medium text-emerald-950 shadow-soft">
            {successMessage}
          </div>
        ) : null}

        {error ? <ErrorAlert error={error} titleOverride="Password reset failed" /> : null}
      </form>

      <div className="mt-6 text-center">
        <Link
          to="/login"
          className="text-small font-bold uppercase tracking-wider text-body-text transition-colors hover:text-dark-blue"
        >
          Return to login
        </Link>
      </div>
    </AuthLayout>
  );
}
