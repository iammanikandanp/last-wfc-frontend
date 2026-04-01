import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Check, Phone } from 'lucide-react';
import axios from 'axios';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        ...formData,
        role: 'member',
        isActive: true,
      };

      const response = await axios.post('https://wfc-backend-server.onrender.com/api/v1/auth/register', payload);

      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 py-8'>
      <div className='w-full max-w-md'>
        <div className='bg-white rounded-lg shadow-2xl p-8'>
          {/* Header */}
          <div className='text-center mb-8'>
            <div className='inline-block bg-red-600 p-3 rounded-lg mb-4'>
              <span className='text-3xl'>💪</span>
            </div>
            <h1 className='text-3xl font-bold text-slate-900'>Join WFC</h1>
            <p className='text-slate-600 text-sm mt-2'>Start your fitness journey</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className='mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded'>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className='space-y-4'>
            {/* Name */}
            <div>
              <label className='block text-sm font-medium text-slate-700 mb-2'>
                Full Name
              </label>
              <div className='relative'>
                <User className='absolute left-3 top-3 text-slate-400' size={20} />
                <input
                  type='text'
                  name='name'
                  value={formData.name}
                  onChange={handleChange}
                  placeholder='Enter your name'
                  className='w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500'
                  
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className='block text-sm font-medium text-slate-700 mb-2'>
                Email Address
              </label>
              <div className='relative'>
                <Mail className='absolute left-3 top-3 text-slate-400' size={20} />
                <input
                  type='email'
                  name='email'
                  value={formData.email}
                  onChange={handleChange}
                  placeholder='Enter your email'
                  className='w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500'
                  required
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className='block text-sm font-medium text-slate-700 mb-2'>
                Phone Number
              </label>
              <div className='relative'>
                <Phone className='absolute left-3 top-3 text-slate-400' size={20} />
                <input
                  type='tel'
                  name='phone'
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder='Enter your phone number'
                  className='w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500'
                  required
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
                  type='password'
                  name='password'
                  value={formData.password}
                  onChange={handleChange}
                  placeholder='Minimum 6 characters'
                  className='w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500'
                  required
                  minLength={6}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type='submit'
              disabled={loading}
              className='w-full bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center space-x-2'
            >
              <Check size={20} />
              <span>{loading ? 'Registering...' : 'Register'}</span>
            </button>
          </form>

          {/* Footer */}
          <div className='mt-6 text-center text-sm text-slate-600'>
            Already have an account?{' '}
            <button
              onClick={() => navigate('/login')}
              className='text-red-600 font-semibold hover:text-red-700'
            >
              Login here
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;

