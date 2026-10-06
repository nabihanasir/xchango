import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Hash, Lock, Mail, Phone, Shield, User } from 'lucide-react';
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

const NAME_PATTERN = /^[A-Za-z][A-Za-z .'-]*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^\+?[0-9][0-9\s-]{6,17}$/;
const SAP_ID_PATTERN = /^[0-9]{5,10}$/;

type SignupValues = Record<'name' | 'email' | 'phone' | 'sapId' | 'password' | 'confirmPassword', string>;

const validateField = (field: keyof SignupValues, values: SignupValues): string => {
  const value = values[field];
  switch (field) {
    case 'name':
      if (!value.trim()) return 'Full name is required.';
      if (value.trim().length < 2) return 'Full name must be at least 2 characters.';
      if (!NAME_PATTERN.test(value.trim())) return 'Full name can only contain letters, spaces, apostrophes and hyphens.';
      return '';
    case 'email':
      if (!value.trim()) return 'Email is required.';
      if (!EMAIL_PATTERN.test(value.trim())) return 'Enter a valid email address, e.g. you@example.com.';
      return '';
    case 'phone': {
      if (!value.trim()) return 'Phone number is required.';
      const digits = value.replace(/[^0-9]/g, '').length;
      if (!PHONE_PATTERN.test(value.trim()) || digits < 7 || digits > 15) {
        return 'Enter a valid phone number (7-15 digits, optional + prefix).';
      }
      return '';
    }
    case 'sapId':
      if (!value.trim()) return 'SAP ID is required.';
      if (!SAP_ID_PATTERN.test(value.trim())) return 'SAP ID must be 5-10 digits.';
      return '';
    case 'password':
      if (!value) return 'Password is required.';
      if (value.length < 8) return 'Password must be at least 8 characters.';
      if (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) return 'Password must include both letters and numbers.';
      return '';
    case 'confirmPassword':
      if (!value) return 'Please confirm your password.';
      if (value !== values.password) return 'Passwords do not match.';
      return '';
  }
};

const validateSignup = (values: SignupValues) => {
  const errors: Record<string, string> = {};
  (Object.keys(values) as (keyof SignupValues)[]).forEach((field) => {
    const message = validateField(field, values);
    if (message) errors[field] = message;
  });
  return errors;
};

export default function Signup() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<AppApiError | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [sapId, setSapId] = useState('');
  const [role, setRole] = useState('student');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const values: SignupValues = { name, email, phone, sapId, password, confirmPassword };

  const checkField = (field: keyof SignupValues, overrides: Partial<SignupValues> = {}) => {
    const message = validateField(field, { ...values, ...overrides });
    setFieldErrors((current) => {
      const next = { ...current };
      if (message) next[field] = message;
      else delete next[field];
      return next;
    });
  };

  // Validate on blur; once a field has been flagged, re-check as the user types so the message clears when fixed.
  const fieldProps = (field: keyof SignupValues, setter: (value: string) => void) => ({
    value: values[field],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      const next = event.target.value;
      setter(next);
      if (fieldErrors[field]) checkField(field, { [field]: next });
      if (field === 'password' && confirmPassword) checkField('confirmPassword', { password: next });
    },
    onBlur: () => checkField(field),
    error: fieldErrors[field],
  });

  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const nextFieldErrors = validateSignup(values);
    const normalizedEmail = email.trim().toLowerCase();

    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length) {
      return;
    }

    setSubmitting(true);

    try {
      const user = await authApi.register({
        name: name.trim(),
        email: normalizedEmail,
        phone: phone.trim(),
        sapId: sapId.trim(),
        role,
        password,
      });

      login(user);
      showToast({
        tone: 'success',
        title: 'Account created',
        description: 'Your student account has been created successfully.',
      });
      navigate('/dashboard', { replace: true });
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
    <AuthLayout title="Create Account" subtitle="Register with clear guidance and instant validation">
      <form className="w-full space-y-6" onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <InputField
            label="Full Name"
            type="text"
            {...fieldProps('name', setName)}
            placeholder="John Doe"
            icon={<User className="h-5 w-5 text-body-text" />}
            required
          />

          <InputField
            label="Email Address"
            type="email"
            {...fieldProps('email', setEmail)}
            placeholder="you@example.com"
            icon={<Mail className="h-5 w-5 text-body-text" />}
            required
          />

          <InputField
            label="Phone Number"
            type="tel"
            {...fieldProps('phone', setPhone)}
            placeholder="+92 300 1234567"
            icon={<Phone className="h-5 w-5 text-body-text" />}
            required
          />

          <InputField
            label="SAP ID"
            type="text"
            {...fieldProps('sapId', setSapId)}
            placeholder="e.g. 70012345"
            icon={<Hash className="h-5 w-5 text-body-text" />}
            required
          />

          <div className="space-y-1.5 md:col-span-2">
            <label className="block pl-1 text-xs font-bold uppercase tracking-widest text-slate-500">Role</label>
            <div className="relative group">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 transition-colors group-focus-within:text-dark-blue">
                <Shield className="h-5 w-5" />
              </div>
              <select
                value={role}
                onChange={(event) => setRole(event.target.value)}
                className="block w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-10 font-medium text-slate-800 shadow-sm transition-all hover:bg-slate-100/50 focus:border-accent-yellow/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-accent-yellow/10"
                required
              >
                <option value="student">Student Account</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
                <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
          </div>

          <InputField
            label="Password"
            type={showPassword ? 'text' : 'password'}
            {...fieldProps('password', setPassword)}
            placeholder="8+ characters, letters and numbers"
            icon={<Lock className="h-5 w-5" />}
            rightIcon={showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            onRightIconClick={() => setShowPassword((value) => !value)}
            required
          />

          <InputField
            label="Confirm Password"
            type={showConfirmPassword ? 'text' : 'password'}
            {...fieldProps('confirmPassword', setConfirmPassword)}
            placeholder="Re-enter your password"
            icon={<Lock className="h-5 w-5" />}
            rightIcon={showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            onRightIconClick={() => setShowConfirmPassword((value) => !value)}
            required
          />
        </div>

        <Button type="submit" variant="primary" className="mt-6 py-4 text-lg">
          {submitting ? 'Creating Account...' : 'Create Account'}
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>

        {error ? <ErrorAlert error={error} titleOverride="Registration failed" /> : null}
      </form>

      <div className="mt-8 flex w-full items-center justify-between">
        <span className="w-1/5 border-b border-light-color lg:w-1/4"></span>
        <Link
          to="/login"
          className="text-small text-center font-bold uppercase tracking-wider text-body-text transition-colors hover:text-dark-blue"
        >
          Already have an account? Sign in
        </Link>
        <span className="w-1/5 border-b border-light-color lg:w-1/4"></span>
      </div>
    </AuthLayout>
  );
}
