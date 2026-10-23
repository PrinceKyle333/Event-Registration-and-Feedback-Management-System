import React, { useState } from 'react';
import { api } from '../services/api';
import { User } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('student1');
  const [password, setPassword] = useState('student123');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [role, setRole] = useState<'student' | 'organizer'>('student');
  const [department, setDepartment] = useState('BSIT 4B');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

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
        onClose();
      } else {
        const res = await api.login(username, password);
        onLoginSuccess(res.user);
        onClose();
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
      onClose();
    } catch (err: any) {
      setError(err.message || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-stone-200">
        {/* Header */}
        <div className="bg-[#00491E] text-white px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold font-serif-cmu text-amber-300">
                {isRegister ? 'Create University Account' : 'CMU Portal Login'}
              </h2>
              <p className="text-xs text-stone-200 mt-0.5">
                Central Mindanao University Event & Feedback System
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-stone-300 hover:text-white text-lg p-1"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
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
                setIsRegister(!isRegister);
                setError(null);
              }}
              className="text-xs text-[#00491E] hover:underline font-medium"
            >
              {isRegister
                ? 'Already registered? Sign in with existing account'
                : 'Need a new student or organizer account? Register here'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
