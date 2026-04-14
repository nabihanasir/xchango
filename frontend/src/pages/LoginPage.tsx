import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import Button from '../components/Button';
import InputField from '../components/InputField';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');

    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(normalizedEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });

      const data = await response.json();

      if (!response.ok || !data?.success || !data?.data) {
        throw new Error(data?.message || 'Invalid email or password.');
      }

      login(data.data);

      const destination =
        data.data.role === 'advisor' ? '/advisor' : data.data.role === 'admin' ? '/admin' : '/dashboard';

      navigate(destination, { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to sign in.');
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

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <Link
          to="/signup"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-accent-yellow to-yellow-default px-6 py-3 text-sm font-bold text-dark-blue shadow-lg shadow-accent-yellow/25 transition hover:-translate-y-0.5"
        >
          Sign Up
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-dark-blue transition hover:border-dark-blue"
        >
          Back to Landing
        </Link>
      </div>

      <form className="w-full space-y-6" onSubmit={handleSubmit}>
        <InputField
          label="Email Address"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          icon={<Mail className="h-5 w-5 text-body-text" />}
          required
        />

        <InputField
          label="Password"
          labelRight={
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Secure access only
            </span>
          }
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter your password"
          icon={<Lock className="h-5 w-5" />}
          rightIcon={showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          onRightIconClick={() => setShowPassword((value) => !value)}
          required
        />

        <Button type="submit" variant="primary" className="mt-6 py-4 text-lg">
          {submitting ? 'Signing In...' : 'Login'}
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>

        {errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {errorMessage}
          </div>
        ) : null}
      </form>

      <div className="mt-8 flex w-full items-center justify-between">
        <span className="w-1/5 border-b border-light-color lg:w-1/4"></span>
        <Link
          to="/"
          className="text-center text-small font-bold uppercase tracking-wider text-body-text transition-colors hover:text-dark-blue"
        >
          Back to landing page
        </Link>
        <span className="w-1/5 border-b border-light-color lg:w-1/4"></span>
      </div>
    </AuthLayout>
  );
}
