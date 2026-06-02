import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Phone, ArrowLeft, UserCheck, Dumbbell, Eye, EyeOff, Copy, Check } from 'lucide-react';
import CustomBaseUrl from '../hooks/CustomBaseUrl';
import Navbar from '../components/Navbar';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'member',
  });
  const [error, setError]         = useState('');
  const [createdUser, setCreatedUser] = useState(null); // stores credentials after success
  const [loading, setLoading]     = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied]       = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCreatedUser(null);

    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }

    setLoading(true);
    try {
      const { confirmPassword: _c, ...payload } = formData;
      await CustomBaseUrl.post('/auth/register', { ...payload, isActive: true });

      // Save credentials to show admin
      setCreatedUser({
        name:     formData.name,
        email:    formData.email,
        phone:    formData.phone,
        password: formData.password,
        role:     formData.role,
      });

      setFormData({ name: '', email: '', phone: '', password: '', confirmPassword: '', role: 'member' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    const text =
      `Name: ${createdUser.name}\n` +
      `Phone: ${createdUser.phone}\n` +
      `Email: ${createdUser.email}\n` +
      `Password: ${createdUser.password}\n` +
      `Login at: WFC Fitness app`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <Navbar />
      <div className="min-h-screen bg-slate-50 py-8 px-4">
        <div className="max-w-lg mx-auto">

          <button onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 text-sm font-medium transition">
            <ArrowLeft size={15} /> Back
          </button>

          {/* ── Credentials card shown after creation ── */}
          {createdUser && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold text-green-800 text-sm">
                  {createdUser.role === 'trainer' ? 'Trainer' : 'Member'} account created — share these credentials
                </p>
                <button onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition font-semibold">
                  {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
                </button>
              </div>
              <div className="space-y-1.5 text-sm font-mono bg-white rounded-xl p-4 border border-green-100">
                <p><span className="text-slate-400">Name:    </span><span className="font-bold text-slate-800">{createdUser.name}</span></p>
                <p><span className="text-slate-400">Phone:   </span><span className="font-bold text-slate-800">{createdUser.phone}</span></p>
                <p><span className="text-slate-400">Email:   </span><span className="font-bold text-slate-800">{createdUser.email}</span></p>
                <p><span className="text-slate-400">Password:</span><span className="font-bold text-red-600"> {createdUser.password}</span></p>
              </div>
              <p className="text-xs text-green-600 mt-2">Tell the {createdUser.role} to login with their phone number and this password.</p>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-lg p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">💪</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Create User Account</h1>
              <p className="text-slate-500 text-sm mt-1">Admin — create member or trainer login</p>
            </div>

            {/* Role selector */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button type="button"
                onClick={() => setFormData(p => ({ ...p, role: 'member' }))}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition ${
                  formData.role === 'member'
                    ? 'border-red-500 bg-red-50 text-red-600'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}>
                <UserCheck size={18} /> Member
              </button>
              <button type="button"
                onClick={() => setFormData(p => ({ ...p, role: 'trainer' }))}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition ${
                  formData.role === 'trainer'
                    ? 'border-red-500 bg-red-50 text-red-600'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}>
                <Dumbbell size={18} /> Trainer
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 text-slate-400" size={18} />
                  <input type="text" name="name" value={formData.name} onChange={handleChange}
                    placeholder="Enter full name" required
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm" />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 text-slate-400" size={18} />
                  <input type="email" name="email" value={formData.email} onChange={handleChange}
                    placeholder="Enter email" required
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm" />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 text-slate-400" size={18} />
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                    placeholder="10-digit phone number" required
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm" />
                </div>
                {formData.role === 'member' && (
                  <p className="text-xs text-blue-500 mt-1">
                    Use the same phone number as their gym registration to auto-link the account.
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 text-slate-400" size={18} />
                  <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange}
                    placeholder="Minimum 6 characters" required minLength={6}
                    className="w-full pl-10 pr-10 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm" />
                  <button type="button" onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-2.5 text-slate-400">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 text-slate-400" size={18} />
                  <input type={showPassword ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange}
                    placeholder="Re-enter password" required minLength={6}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm" />
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full bg-red-600 text-white py-2.5 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 text-sm mt-2">
                {loading ? 'Creating...' : `Create ${formData.role === 'trainer' ? 'Trainer' : 'Member'} Account`}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
