import React, { useState } from 'react';
import { api } from '../services/api';
import { User } from '../types';

export type AuthMode = 'login' | 'register';

interface AuthFormProps {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onLoginSuccess: (user: User) => void;
}

// Sign-in / registration form shared by the login modal and the landing page hero
export const AuthForm: React.FC<AuthFormProps> = ({ mode, onModeChange, onLoginSuccess }) => {
  const isRegister = mode === 'register';
  const [username, setUsername] = useState('student1');
  const [password, setPassword] = useState('student123');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [role, setRole] = useState<'student' | 'organizer'>('student');
  const [department, setDepartment] = useState('BSIT 4B');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        const res = await api.register({
          username,
          passwordPlain: password,
          full_name: fullName,
          email,
          role,
          student_id: studentId,
          college_department: department,
        });
        onLoginSuccess(res.user);
      } else {
        const res = await api.login(username, password);
        onLoginSuccess(res.user);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (u: string, p: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.login(u, p);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
          {error}
        </div>
      )}

      {/* Quick Demo Selector */}
      {!isRegister && (
        <div className="mb-5 p-3 bg-stone-50 border border-stone-200 rounded-lg">
          <span className="text-xs font-semibold text-stone-700 block mb-2">
            Quick Sign-In with Demo Accounts:
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemo('student1', 'student123')}
              className="py-1.5 px-2 text-xs font-medium bg-white border border-stone-300 rounded hover:border-[#00491E] hover:text-[#00491E] transition-colors text-center"
            >
              Student 1
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('organizer1', 'organizer123')}
              className="py-1.5 px-2 text-xs font-medium bg-white border border-stone-300 rounded hover:border-[#00491E] hover:text-[#00491E] transition-colors text-center"
            >
              Organizer
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('admin', 'admin123')}
              className="py-1.5 px-2 text-xs font-medium bg-white border border-stone-300 rounded hover:border-[#00491E] hover:text-[#00491E] transition-colors text-center"
            >
              Admin
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Username
          </label>
          <input
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. s.reston or admin"
            className="w-full px-3 py-2 text-sm border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00491E] focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3 py-2 text-sm border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00491E] focus:border-transparent"
          />
        </div>

        {isRegister && (
          <>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Juan C. Dela Cruz"
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00491E]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                CMU Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@cmu.edu.ph"
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00491E]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'student' | 'organizer')}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00491E]"
                >
                  <option value="student">Student</option>
                  <option value="organizer">Organizer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Student ID No.
                </label>
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="2023-BSIT-XXXX"
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00491E]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                College / Department
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. BSIT 4B / CISC"
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00491E]"
              />
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-[#00491E] text-white font-medium text-sm rounded-md hover:bg-[#02681E] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00491E] disabled:opacity-50"
        >
          {loading ? 'Processing...' : isRegister ? 'Register Account' : 'Sign In'}
        </button>
      </form>

      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => {
            onModeChange(isRegister ? 'login' : 'register');
            setError(null);
          }}
          className="text-xs text-[#00491E] hover:underline font-medium"
        >
          {isRegister
            ? 'Already registered? Sign in with existing account'
            : 'Need a new student or organizer account? Register here'}
        </button>
      </div>
    </>
  );
};

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const isRegister = mode === 'register';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[calc(100vh-2rem)] overflow-hidden border border-stone-200 flex flex-col md:flex-row">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 text-white md:text-stone-400 md:hover:text-stone-700 hover:text-stone-200 text-lg p-1"
        >
          ✕
        </button>

        {/* Branding side panel */}
        <div className="bg-cmu-pattern text-white md:w-5/12 shrink-0 px-6 py-5 md:p-8 flex md:flex-col items-center md:justify-center gap-4 md:gap-5 md:text-center border-b-4 md:border-b-0 md:border-r-4 border-[#FFC600]">
          <img
            src="/cmu-logo.png"
            alt="CMU logo"
            className="logo-tilt w-12 h-12 md:w-36 md:h-36 object-contain drop-shadow-2xl shrink-0"
          />
          <div className="min-w-0">
            <h2 className="text-xl md:text-2xl font-bold font-serif-cmu text-amber-300">
              {isRegister ? 'Create University Account' : 'CMU Portal Login'}
            </h2>
            <p className="text-xs text-stone-200 mt-1">
              Central Mindanao University Event &amp; Feedback System
            </p>
            <p className="hidden md:block text-xs text-white/70 mt-4 leading-relaxed">
              {isRegister
                ? 'Register as a student or organizer to join campus events, track your attendance, and share feedback.'
                : 'Sign in to register for campus events, manage your attendance, and submit event evaluations.'}
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto">
          <AuthForm
            mode={mode}
            onModeChange={setMode}
            onLoginSuccess={(u) => {
              onLoginSuccess(u);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
};
