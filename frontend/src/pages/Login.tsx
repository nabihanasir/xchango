import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import InputField from '../components/InputField';
import Button from '../components/Button';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <AuthLayout title="Welcome Back" subtitle="Please sign in to your account">
      <form className="space-y-6 w-full" onSubmit={(e) => e.preventDefault()}>
        
        <InputField
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          icon={<Mail className="h-5 w-5 text-body-text" />}
          required
        />

        <div className="space-y-2">
          <div className="flex justify-between items-center px-1">
            <label className="block text-small font-bold text-dark-blue uppercase tracking-wider">
              Password
            </label>
            <a href="#" className="text-small text-accent-yellow hover:text-yellow-default font-medium transition-colors">
              Forgot Password?
            </a>
          </div>
          
          <div className="relative">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-body-text" />
             </div>
             <input
               type={showPassword ? 'text' : 'password'}
               value={password}
               onChange={(e) => setPassword(e.target.value)}
               className="block w-full pl-10 pr-10 py-3 border border-light-color rounded-lg focus:outline-none focus:ring-2 focus:ring-dark-blue focus:border-transparent transition-all text-body-text placeholder-gray-400"
               placeholder="••••••••"
               required
             />
             <button
               type="button"
               onClick={() => setShowPassword(!showPassword)}
               className="absolute inset-y-0 right-0 pr-3 flex items-center text-body-text hover:text-dark-blue focus:outline-none transition-colors"
             >
               {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
             </button>
          </div>
        </div>

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
