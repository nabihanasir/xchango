import { useState } from 'react';
import { ArrowLeft, KeyRound, Link as LinkIcon, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import Button from '../components/Button';
import ErrorAlert from '../components/ErrorAlert';
import InputField from '../components/InputField';
import { useToast } from '../context/ToastContext';
import { authApi, type ForgotPasswordResponse } from '../lib/authApi';
import { parseApiError } from '../lib/errorUtils';
import { AppApiError } from '../types/error';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<AppApiError | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ForgotPasswordResponse | null>(null);
  const { showToast } = useToast();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setResult(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setFieldError('Email is required.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setFieldError('Email is invalid format.');
      return;
    }

    setFieldError(undefined);
    setSubmitting(true);

    try {
      const response = await authApi.forgotPassword({ email: normalizedEmail });
      setResult(response);
      showToast({
        tone: 'success',
        title: 'Reset link prepared',
        description: response.message,
      });
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
    <AuthLayout title="Reset Password" subtitle="Request a secure reset link for your account">
      <div className="mb-6 rounded-2xl border border-dark-blue/10 bg-dark-blue/5 px-4 py-3 text-sm font-medium text-dark-blue">
        Enter the email address linked to your Xchango account. If it exists, we&apos;ll prepare a password reset
        link for you.
      </div>

      <form className="w-full space-y-6" onSubmit={handleSubmit}>
        <InputField
          label="Email Address"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          icon={<Mail className="h-5 w-5 text-body-text" />}
          error={fieldError}
          required
        />

        <Button type="submit" variant="primary" className="mt-6 py-4 text-lg" disabled={submitting}>
          {submitting ? 'Preparing Reset Link...' : 'Send Reset Link'}
          <KeyRound className="ml-2 h-5 w-5" />
        </Button>

        {error ? <ErrorAlert error={error} titleOverride="Password reset failed" /> : null}
      </form>

      {result ? (
        <div className="mt-6 rounded-[1.75rem] border border-emerald-200 bg-emerald-50/90 p-5 text-emerald-950 shadow-soft">
          <p className="text-lg font-black">Check your email flow</p>
          <p className="mt-2 text-sm leading-6">{result.message}</p>
          {result.resetUrl ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Development reset link</p>
              <a
                href={result.resetUrl}
                className="mt-2 inline-flex items-center gap-2 break-all text-sm font-semibold text-dark-blue underline decoration-dark-blue/30 underline-offset-4"
              >
                <LinkIcon className="h-4 w-4" />
                {result.resetUrl}
              </a>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 text-center">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-small font-bold uppercase tracking-wider text-body-text transition-colors hover:text-dark-blue"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>
      </div>
    </AuthLayout>
  );
}
