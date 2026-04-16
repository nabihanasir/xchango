import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import Button from '../components/Button';
import ErrorAlert from '../components/ErrorAlert';
import InputField from '../components/InputField';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { authApi } from '../lib/authApi';
import { parseApiError } from '../lib/errorUtils';
import { AppApiError } from '../types/error';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<AppApiError | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const nextFieldErrors: { email?: string; password?: string } = {};
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      nextFieldErrors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      nextFieldErrors.email = 'Email is invalid format.';
    }

    if (!password) {
      nextFieldErrors.password = 'Password is required.';
    }

    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length) {
      return;
    }

    setSubmitting(true);

    try {
      const user = await authApi.login({ email: normalizedEmail, password });
      login(user);

      showToast({
        tone: 'success',
        title: 'Login successful',
        description: 'Your account is ready and you are being redirected.',
      });

      const destination = user.role === 'advisor' ? '/advisor' : user.role === 'admin' ? '/admin' : '/dashboard';
      navigate(destination, { replace: true });
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
    <AuthLayout title="Welcome Back" subtitle="Sign in to continue your international learning journey">
      <div className="mb-6 rounded-2xl border border-accent-yellow/40 bg-accent-yellow/10 px-4 py-3 text-sm font-medium text-dark-blue">
        Returning users can log in to continue with applications, equivalency requests, and international program
        exploration.
      </div>

      <form className="w-full space-y-6" onSubmit={handleSubmit}>
        <InputField
          label="Email Address"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          icon={<Mail className="h-5 w-5 text-body-text" />}
          error={fieldErrors.email}
          required
        />

        <InputField
          label="Password"
          labelRight={
            <Link
              to="/forgot-password"
              className="text-[11px] font-bold uppercase tracking-widest text-slate-400 transition-colors hover:text-dark-blue"
            >
              Forgot password?
            </Link>
          }
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter your password"
          icon={<Lock className="h-5 w-5" />}
          rightIcon={showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          onRightIconClick={() => setShowPassword((value) => !value)}
          error={fieldErrors.password}
          required
        />

        <Button type="submit" variant="primary" className="mt-6 py-4 text-lg">
          {submitting ? 'Signing In...' : 'Login'}
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>

        {error ? <ErrorAlert error={error} titleOverride="Login failed" /> : null}
      </form>

      <div className="mt-8 flex w-full items-center justify-between">
        <span className="w-1/5 border-b border-light-color lg:w-1/4"></span>
        <Link
          to="/signup"
          className="text-center text-small font-bold uppercase tracking-wider text-body-text transition-colors hover:text-dark-blue"
        >
          Don&apos;t have an account? Sign up
        </Link>
        <span className="w-1/5 border-b border-light-color lg:w-1/4"></span>
      </div>

      <div className="mt-4 text-center">
        <Link
          to="/"
          className="text-small font-bold uppercase tracking-wider text-body-text transition-colors hover:text-dark-blue"
        >
          Back to landing page
        </Link>
      </div>
    </AuthLayout>
  );
}
