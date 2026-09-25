import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import CustomBaseUrl from '../hooks/CustomBaseUrl';

const Login = () => {
  const [role, setRole] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [dob, setDob] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!role) {
      setError('Please select a role.');
      setLoading(false);
      return;
    }

    try {
      if (role === 'member') {
        if (!mobile) {
          setError('Please enter your mobile number.');
          setLoading(false);
          return;
        }
        if (!dob) {
          setError('Please enter your date of birth.');
          setLoading(false);
          return;
        }

        const response = await CustomBaseUrl.post('/member/auth/login', {
          mobile,
          password: dob,
        });

        if (response.data.success) {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.member));
          navigate(`/members/${response.data.member.id}`);
        }
      } else {
        // Admin or Trainer login
        const payload = {
          password,
          email: identifier,
          username: identifier,
          role,
        };

        const response = await CustomBaseUrl.post('/auth/login', payload);

        if (response.data.success) {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.user));
          navigate('/dashboard');
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      // Normalize specific messages to match requirements if needed, but backend gives correct messages
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-slate-300  flex items-center justify-center p-4'>
      <div className='w-full max-w-md'>
        <div className='bg-white rounded-lg shadow-2xl p-8'>
          {/* Header */}
          <div className='text-center mb-8'>
            <div className='inline-flex bg-white p-1.5 rounded-full shadow mb-4'>
              <img src='/logo.jpeg' alt='WFC logo' className='w-24 h-24 rounded-full object-cover' />
            </div>
            <h1 className='text-3xl font-bold text-slate-900'>WFC Fitness</h1>
            <p className='text-slate-600 text-sm mt-2'>Wolverine Fitness Club</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className='mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded'>
              {error}
            </div>
          )}

          {/* Role Selection */}
          <div className='flex justify-center gap-2 mb-6'>
            {['admin', 'trainer', 'member'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => { setRole(r); setError(''); }}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition capitalize ${
                  role === r
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className='space-y-4'>
            {!role ? (
              <div className='text-center text-slate-500 py-4'>
                Please select a role to continue.
              </div>
            ) : role === 'member' ? (
              <>
                {/* Mobile */}
                <div>
                  <label className='block text-sm font-medium text-slate-700 mb-2'>
                    Mobile Number
                  </label>
                  <div className='relative'>
                    <Mail className='absolute left-3 top-3 text-slate-400' size={20} />
                    <input
                      type='text'
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder='Enter your mobile number'
                      className='w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500'
                    />
                  </div>
                </div>

                {/* DOB */}
                <div>
                  <label className='block text-sm font-medium text-slate-700 mb-2'>
                    Date of Birth
                  </label>
                  <div className='relative'>
                    <Lock className='absolute left-3 top-3 text-slate-400' size={20} />
                    <input
                      type='date'
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className='w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-700 uppercase'
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Username/Email */}
                <div>
                  <label className='block text-sm font-medium text-slate-700 mb-2'>
                    Username or Email
                  </label>
                  <div className='relative'>
                    <Mail className='absolute left-3 top-3 text-slate-400' size={20} />
                    <input
                      type='text'
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder='Enter your username or email'
                      className='w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500'
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className='block text-sm font-medium text-slate-700 mb-2'>
                    Password
                  </label>
                  <div className='relative'>
                    <Lock className='absolute left-3 top-3 text-slate-400' size={20} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder='Enter your password'
                      className='w-full pl-10 pr-10 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500'
                    />
                    <button
                      type='button'
                      onClick={() => setShowPassword(!showPassword)}
                      className='absolute right-3 top-3 text-slate-400'
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Forgot Password */}
            <div className='text-right'>
              <a href='/forgot-password' className='text-sm text-red-600 hover:text-red-700'>
                Forgot password?
              </a>
            </div>

            {/* Submit Button */}
            <button
              type='submit'
              disabled={loading}
              className='w-full bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50'
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          {/* Footer */}
          <div className='mt-6 text-center text-sm text-slate-500'>
            Contact your admin to get access.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

