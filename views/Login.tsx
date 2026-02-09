import React, { useState } from 'react';
import { db } from '../services/db';
import { User } from '../types';
import { Button, Card, Input, AcropolisLogo } from '../components/UI';
import { Lock, Mail, Eye, EyeOff } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await db.login(email, password);
      onLogin(user);
    } catch (err: any) {
      console.error(err);
      // Check for specific Firebase error codes safely
      if (err.code === 'auth/invalid-api-key') {
        setError("Config Error: Your API Key does not match your Firebase Project. Please check services/db.ts");
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError("Invalid email or password. Check Firebase Console Authentication.");
      } else if (err.code) {
        // Any other firebase error
        setError(err.message || "Login failed. Check console for details.");
      } else {
        // Fallback or Mock mode error
        setError("Invalid email or password.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-200 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-indigo-600 relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-24 w-24 mb-2 bg-indigo-50 rounded-full p-4 shadow-sm">
            <AcropolisLogo className="h-full w-full" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Acropolis AMS</h1>
          <p className="text-slate-600 mt-2">Sign in to your account</p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 text-sm" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Enrollment ID or Email"
              className="pl-10"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              className="pl-10 pr-10"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 focus:outline-none"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          <Button type="submit" className="w-full py-2.5 mt-2" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </Card>
    </div>
  );
};