import React, { useState } from 'react';
import { db } from '../services/db';
import { User, SystemSettings } from '../types';
import { Button, Card, Input, AcropolisLogo, Select, AboutDeveloperModal } from '../components/UI';
import { Lock, Mail, Eye, EyeOff, Users } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDevModalOpen, setIsDevModalOpen] = useState(false);
  const [settings, setSettings] = useState<SystemSettings>({ studentLoginEnabled: true });

  const [selectedRole, setSelectedRole] = useState<'FACULTY' | 'COORDINATOR' | 'STUDENT'>('FACULTY');

  React.useEffect(() => {
    db.getSystemSettings().then(setSettings).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (selectedRole === 'STUDENT' && !settings.studentLoginEnabled) {
        throw new Error("Student login is currently disabled by administrator.");
      }

      const user = await db.login(email, password);

      // 0. Automatic Admin Logic: If user is admin, ignore selection and log in as admin
      if (user.role === 'ADMIN') {
        sessionStorage.removeItem('login_intent');
        onLogin(user);
        return;
      }

      // Verification logic for specific selections
      if (selectedRole === 'STUDENT' && user.role !== 'STUDENT') {
        throw new Error("This account is not a Student account.");
      }
      if (selectedRole === 'FACULTY' && user.role !== 'FACULTY') {
        throw new Error("This account is not a Faculty account.");
      }

      if (selectedRole === 'COORDINATOR') {
        if (user.role !== 'FACULTY') {
          throw new Error("This account is not a Faculty/Coordinator account.");
        }
        const coord = await db.getCoordinatorByFaculty(user.uid);
        if (!coord) {
          throw new Error("You are not assigned as a Class Coordinator.");
        }
        // We'll store a flag in sessionStorage to redirect to coordinator view
        sessionStorage.setItem('login_intent', 'COORDINATOR');
      } else {
        sessionStorage.removeItem('login_intent');
      }

      onLogin(user);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-200 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-indigo-600 relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-24 w-24 mb-2 bg-white rounded-full p-1 shadow-sm border border-slate-100">
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
            <Users className="absolute left-3 top-3.5 h-4 w-4 text-slate-400 z-10" />
            <Select
              value={selectedRole}
              onChange={(e: any) => setSelectedRole(e.target.value)}
              className="pl-10"
              required
            >
              <option value="FACULTY">Login as Faculty</option>
              <option value="COORDINATOR">Login as Class Coordinator</option>
              {settings.studentLoginEnabled && <option value="STUDENT">Login as Student</option>}
            </Select>
          </div>

          <div className="relative">
            <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
            <Input
              type="text"
              placeholder="User ID"
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

        <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center">
          <button
            onClick={() => setIsDevModalOpen(true)}
            className="group flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-full transition-all duration-300 transform hover:scale-105 active:scale-95"
          >
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-indigo-600">
              About the Developer
            </span>
          </button>
        </div>
      </Card>
      <AboutDeveloperModal isOpen={isDevModalOpen} onClose={() => setIsDevModalOpen(false)} />
    </div>
  );
};
