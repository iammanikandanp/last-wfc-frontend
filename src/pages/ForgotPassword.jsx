import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';
import CustomBaseUrl from '../hooks/CustomBaseUrl';

const ForgotPassword = () => {
  const [step, setStep]               = useState(1); // 1 = enter identity, 2 = new password, 3 = success
  const [identifier, setIdentifier]   = useState('');
  const [resetToken, setResetToken]   = useState('');  // stored internally, never shown
  const [password, setPassword]       = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword]       = useState(false);
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);
  const navigate = useNavigate();

  // Step 1 — find account by email or phone
  const handleFindAccount = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const isPhone = /^\d{10}$/.test(identifier.trim());
      const payload = isPhone ? { phone: identifier.trim() } : { email: identifier.trim() };

      const res = await CustomBaseUrl.post('/auth/forgot-password', payload);
      if (res.data.success) {
        setResetToken(res.data.resetToken);
        setStep(2);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Account not found');
    } finally {
      setLoading(false);
    }
  };

  // Step 2 — set new password using the token we got
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }
    if (password.length < 6) {
      return setError('Password must be at least 6 characters');
    }

    setLoading(true);
    try {
      const res = await CustomBaseUrl.post('/auth/reset-password', {
        token: resetToken,
        password,
      });
      if (res.data.success) {
        setStep(3);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-block bg-red-600 p-3 rounded-xl mb-4">
              <span className="text-3xl">💪</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              {step === 1 && 'Forgot Password'}
              {step === 2 && 'Set New Password'}
              {step === 3 && 'Password Reset!'}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {step === 1 && 'Enter your email or phone to continue'}
              {step === 2 && 'Choose a new password for your account'}
              {step === 3 && 'You can now login with your new password'}
            </p>
          </div>

          {/* Step indicator */}
          {step < 3 && (
            <div className="flex items-center gap-2 mb-6">
              {[1, 2].map((n) => (
                <React.Fragment key={n}>
                  <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold flex-shrink-0 transition-all ${
                    step === n ? 'bg-red-600 text-white' : step > n ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-400'
                  }`}>
                    {step > n ? '✓' : n}
                  </div>
                  {n < 2 && <div className={`flex-1 h-1 rounded-full transition-all ${step > n ? 'bg-green-400' : 'bg-slate-200'}`} />}
                </React.Fragment>
              ))}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* ── Step 1: Find account ── */}
          {step === 1 && (
            <form onSubmit={handleFindAccount} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email or Phone Number
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 text-slate-400" size={18} />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter email or 10-digit phone"
                    required
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                  />
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full bg-red-600 text-white py-2.5 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 text-sm">
                {loading ? 'Checking...' : 'Continue'}
              </button>
            </form>
          )}

          {/* ── Step 2: New password ── */}
          {step === 2 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 text-slate-400" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    required
                    minLength={6}
                    className="w-full pl-10 pr-10 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                  />
                  <button type="button" onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-2.5 text-slate-400">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 text-slate-400" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    required
                    minLength={6}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                  />
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full bg-red-600 text-white py-2.5 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 text-sm">
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>

              <button type="button" onClick={() => { setStep(1); setError(''); }}
                className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-slate-800 text-sm py-1 transition">
                <ArrowLeft size={14} /> Back
              </button>
            </form>
          )}

          {/* ── Step 3: Success ── */}
          {step === 3 && (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle size={56} className="text-green-500" />
              </div>
              <p className="text-slate-600 text-sm mb-6">
                Your password has been reset successfully. Login with your new password.
              </p>
              <button onClick={() => navigate('/login')}
                className="w-full bg-red-600 text-white py-2.5 rounded-lg font-semibold hover:bg-red-700 transition text-sm">
                Go to Login
              </button>
            </div>
          )}

          {/* Footer */}
          {step === 1 && (
            <div className="mt-6 text-center">
              <button onClick={() => navigate('/login')}
                className="flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mx-auto transition">
                <ArrowLeft size={14} /> Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
