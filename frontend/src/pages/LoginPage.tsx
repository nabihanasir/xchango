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
      <form className="w-full space-y-4" onSubmit={handleSubmit}>
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
              className="text-xs font-bold uppercase tracking-widest text-slate-600 transition-colors hover:text-dark-blue"
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

        <Button type="submit" variant="primary" className="mt-6 mx-auto !w-56 py-2.5 text-base">
          {submitting ? 'Signing In...' : 'Login'}
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>

        {error ? <ErrorAlert error={error} titleOverride="Login failed" /> : null}
      </form>

      <p className="mt-6 text-center text-sm font-medium text-slate-600">
        Don&apos;t have an account?{' '}
        <Link to="/signup" className="font-bold text-dark-blue underline-offset-4 hover:underline">
          Sign up
        </Link>
      </p>

      <div className="mt-3 text-center">
        <Link to="/" className="text-sm font-medium text-slate-500 transition-colors hover:text-dark-blue">
          Back to landing page
        </Link>
      </div>
    </AuthLayout>
  );
}
