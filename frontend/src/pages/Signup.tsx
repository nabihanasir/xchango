import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, User, Phone, Hash, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import InputField from '../components/InputField';
import Button from '../components/Button';

export default function Signup() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [sapId, setSapId] = useState('');
  const [role, setRole] = useState('student');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e: React.SyntheticEvent) => {
  e.preventDefault();

  if (password !== confirmPassword) {
    alert('Passwords do not match');
    return;
  }
  const res = await fetch('http://localhost:5000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, phone, sapId, role, password }),
  });

  const data = await res.json();
  console.log(data);

  };
  
  return (
    <AuthLayout title="Create Account" subtitle="Join Xchango today">
      <form className="space-y-6 w-full" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <InputField
            label="Full Name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            icon={<User className="h-5 w-5 text-body-text" />}
            required
          />

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
            label="Phone Number"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+92 300 1234567"
            icon={<Phone className="h-5 w-5 text-body-text" />}
            required
          />

          <InputField
            label="SAP ID"
            type="text"
            value={sapId}
            onChange={(e) => setSapId(e.target.value)}
            placeholder="e.g. 70012345"
            icon={<Hash className="h-5 w-5 text-body-text" />}
            required
          />

          {/* Role Selection */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest pl-1">
              Role
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-dark-blue transition-colors">
                <Shield className="h-5 w-5" />
              </div>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="block w-full pl-12 pr-10 py-3.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-accent-yellow/50 rounded-xl focus:outline-none focus:ring-4 focus:ring-accent-yellow/10 transition-all text-slate-800 font-medium shadow-sm appearance-none cursor-pointer"
                required
              >
                <option value="student">Student Account</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
              </div>
            </div>
          </div>

          <InputField
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            icon={<Lock className="h-5 w-5" />}
            rightIcon={showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            onRightIconClick={() => setShowPassword(!showPassword)}
            required
          />

          <InputField
            label="Confirm Password"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            icon={<Lock className="h-5 w-5" />}
            rightIcon={showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            onRightIconClick={() => setShowConfirmPassword(!showConfirmPassword)}
            required
          />
          
        </div>

        <Button type="submit" variant="primary" className="py-4 text-lg mt-6">
          Create Account
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </form>

      <div className="w-full mt-8 flex items-center justify-between">
        <span className="w-1/5 border-b border-light-color lg:w-1/4"></span>
        <Link to="/login" className="text-small text-center text-body-text uppercase hover:text-dark-blue tracking-wider transition-colors font-bold">
          Already have an account? Sign in
        </Link>
        <span className="w-1/5 border-b border-light-color lg:w-1/4"></span>
      </div>
    </AuthLayout>
  );
}
