import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import InputField from '../components/InputField';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
 
const { login } = useAuth();

const handleSubmit = async (e: React.SyntheticEvent) => {
  e.preventDefault();

  const res = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  login(data.data);          // saves user + token to context and localStorage
  const destination =
    data.data.role === 'advisor'
      ? '/advisor'
      : data.data.role === 'admin'
        ? '/admin'
        : '/dashboard';
  window.location.href = destination;
};
  return (
    <AuthLayout title="Welcome Back" subtitle="Please sign in to your account">
      <form className="space-y-6 w-full" onSubmit={handleSubmit}>
        
        <InputField
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          icon={<Mail className="h-5 w-5 text-body-text" />}
          required
        />

        <InputField
          label="Password"
          labelRight={
            <a href="#" className="text-[11px] text-accent-yellow hover:text-yellow-default font-bold transition-colors uppercase tracking-widest">
              Forgot Password?
            </a>
          }
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          icon={<Lock className="h-5 w-5" />}
          rightIcon={showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          onRightIconClick={() => setShowPassword(!showPassword)}
          required
        />

        <Button type="submit" variant="primary" className="py-4 text-lg mt-6">
          Sign In
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </form>

      <div className="w-full mt-8 flex items-center justify-between">
        <span className="w-1/5 border-b border-light-color lg:w-1/4"></span>
        <Link to="/signup" className="text-small text-center text-body-text uppercase hover:text-dark-blue tracking-wider transition-colors font-bold">
          Do not have an account? Sign up
        </Link>
        <span className="w-1/5 border-b border-light-color lg:w-1/4"></span>
      </div>

    </AuthLayout>
  );
}
