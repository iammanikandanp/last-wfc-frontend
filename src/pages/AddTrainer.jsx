import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import CustomBaseUrl from '../hooks/CustomBaseUrl';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';

const AddTrainer = () => {
  const token = localStorage.getItem('token');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    userId: '',
    specialization: '',
    certification: '',
    yearsOfExperience: '',
    bio: '',
    hourlyRate: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Parse specialization and certification as arrays
      const data = {
        ...formData,
        specialization: formData.specialization
          .split(',')
          .map(s => s.trim())
          .filter(s => s),
        certification: formData.certification
          .split(',')
          .map(c => c.trim())
          .filter(c => c),
      };

      const response = await CustomBaseUrl.post('/trainers', data);

      if (response.data.success) {
        alert('Trainer created successfully!');
        navigate('/training');
      }
    } catch (error) {
      console.error('Error creating trainer:', error);
      setError(error.response?.data?.message || 'Failed to create trainer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Navbar />
      <div className='min-h-screen bg-slate-50'>
        <div className='max-w-2xl mx-auto px-4 py-8'>
          {/* Header */}
          <div className='flex items-center space-x-3 mb-8'>
            <button
              onClick={() => navigate('/training')}
              className='p-2 hover:bg-slate-200 rounded-lg transition'
            >
              <ArrowLeft size={20} className='text-slate-700' />
            </button>
            <div>
              <h1 className='text-3xl font-bold text-slate-900'>Add New Trainer</h1>
              <p className='text-slate-600 mt-1'>Register a new fitness trainer</p>
            </div>
          </div>

          {/* Form */}
          <div className='bg-white rounded-lg shadow-md p-8'>
            {error && (
              <div className='mb-6 p-4 bg-red-100 text-red-700 rounded-lg'>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className='space-y-6'>
              {/* Basic Information */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-slate-700 mb-2'>
                    User ID *
                  </label>
                  <input
                    type='text'
                    name='userId'
                    value={formData.userId}
                    onChange={handleChange}
                    required
                    className='w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500'
                    placeholder='Enter user ID'
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-slate-700 mb-2'>
                    Years of Experience *
                  </label>
                  <input
                    type='number'
                    name='yearsOfExperience'
                    value={formData.yearsOfExperience}
                    onChange={handleChange}
                    required
                    className='w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500'
                    placeholder='5'
                  />
                </div>
              </div>

              {/* Specialization */}
              <div>
                <label className='block text-sm font-medium text-slate-700 mb-2'>
                  Specialization (comma-separated) *
                </label>
                <textarea
                  name='specialization'
                  value={formData.specialization}
                  onChange={handleChange}
                  required
                  className='w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500'
                  placeholder='Strength Training, Cardio, Yoga'
                  rows='3'
                />
              </div>

              {/* Certification */}
              <div>
                <label className='block text-sm font-medium text-slate-700 mb-2'>
                  Certification (comma-separated) *
                </label>
                <textarea
                  name='certification'
                  value={formData.certification}
                  onChange={handleChange}
                  required
                  className='w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500'
                  placeholder='ACE, ISSA, NASM'
                  rows='3'
                />
              </div>

              {/* Hourly Rate */}
              <div>
                <label className='block text-sm font-medium text-slate-700 mb-2'>
                  Hourly Rate (₹) *
                </label>
                <input
                  type='number'
                  name='hourlyRate'
                  value={formData.hourlyRate}
                  onChange={handleChange}
                  required
                  className='w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500'
                  placeholder='500'
                />
              </div>

              {/* Bio */}
              <div>
                <label className='block text-sm font-medium text-slate-700 mb-2'>
                  Bio
                </label>
                <textarea
                  name='bio'
                  value={formData.bio}
                  onChange={handleChange}
                  className='w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500'
                  placeholder='Write about the trainer...'
                  rows='4'
                />
              </div>

              {/* Actions */}
              <div className='flex space-x-4 pt-6 border-t'>
                <button
                  type='submit'
                  disabled={loading}
                  className='flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition disabled:opacity-50'
                >
                  {loading ? 'Creating...' : 'Create Trainer'}
                </button>
                <button
                  type='button'
                  onClick={() => navigate('/training')}
                  className='flex-1 bg-slate-300 text-slate-900 py-2 rounded-lg hover:bg-slate-400 transition'
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddTrainer;

