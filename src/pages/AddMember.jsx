import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';

const AddMember = () => {
  const token = localStorage.getItem('token');
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    userId: '',
    dateOfBirth: '',
    gender: 'Male',
    height: '',
    weight: '',
    chest: '',
    waist: '',
    hip: '',
    arm: '',
    thigh: '',
    profession: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    currentPlan: '',
    startDate: '',
    planDuration: 30,
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await axios.get('https://wfc-backend-server.onrender.com/api/v1/plans');
      if (response.data.success) {
        setPlans(response.data.plans);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
      setError('Failed to fetch plans');
    }
  };

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
      const response = await axios.post(
        'https://wfc-backend-server.onrender.com/api/v1/members',
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert('Member created successfully!');
        navigate('/members');
      }
    } catch (error) {
      console.error('Error creating member:', error);
      setError(error.response?.data?.message || 'Failed to create member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Navbar />
      <div className='min-h-screen bg-slate-50'>
        <div className='max-w-4xl mx-auto px-4 py-8'>
          {/* Header */}
          <div className='flex items-center space-x-3 mb-8'>
            <button
              onClick={() => navigate('/members')}
              className='p-2 hover:bg-slate-200 rounded-lg transition'
            >
              <ArrowLeft size={20} className='text-slate-700' />
            </button>
            <div>
              <h1 className='text-3xl font-bold text-slate-900'>Add New Member</h1>
              <p className='text-slate-600 mt-1'>Register a new gym member</p>
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
              <div>
                <h2 className='text-xl font-semibold text-slate-900 mb-4'>Basic Information</h2>
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
                      Date of Birth
                    </label>
                    <input
                      type='date'
                      name='dateOfBirth'
                      value={formData.dateOfBirth}
                      onChange={handleChange}
                      className='w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-slate-700 mb-2'>
                      Gender
                    </label>
                    <select
                      name='gender'
                      value={formData.gender}
                      onChange={handleChange}
                      className='w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500'
                    >
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-slate-700 mb-2'>
                      Profession
                    </label>
                    <input
                      type='text'
                      name='profession'
                      value={formData.profession}
                      onChange={handleChange}
                      className='w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500'
                      placeholder='Enter profession'
                    />
                  </div>
                </div>
              </div>

              {/* Physical Measurements */}
              <div>
                <h2 className='text-xl font-semibold text-slate-900 mb-4'>Physical Measurements</h2>
                <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
                  <div>
                    <label className='block text-sm font-medium text-slate-700 mb-2'>
                      Height (cm)
                    </label>
                    <input
                      type='number'
                      name='height'
                      value={formData.height}
                      onChange={handleChange}
                      className='w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500'
                      placeholder='175'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-slate-700 mb-2'>
                      Weight (kg)
                    </label>
                    <input
                      type='number'
                      name='weight'
                      value={formData.weight}
                      onChange={handleChange}
                      className='w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500'
                      placeholder='75'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-slate-700 mb-2'>
                      Chest (cm)
                    </label>
                    <input
                      type='number'
                      name='chest'
                      value={formData.chest}
                      onChange={handleChange}
                      className='w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500'
                      placeholder='95'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-slate-700 mb-2'>
                      Waist (cm)
                    </label>
                    <input
                      type='number'
                      name='waist'
                      value={formData.waist}
                      onChange={handleChange}
                      className='w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500'
                      placeholder='85'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-slate-700 mb-2'>
                      Hip (cm)
                    </label>
                    <input
                      type='number'
                      name='hip'
                      value={formData.hip}
                      onChange={handleChange}
                      className='w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500'
                      placeholder='95'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-slate-700 mb-2'>
                      Arm (cm)
                    </label>
                    <input
                      type='number'
                      name='arm'
                      value={formData.arm}
                      onChange={handleChange}
                      className='w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500'
                      placeholder='32'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-slate-700 mb-2'>
                      Thigh (cm)
                    </label>
                    <input
                      type='number'
                      name='thigh'
                      value={formData.thigh}
                      onChange={handleChange}
                      className='w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500'
                      placeholder='55'
                    />
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div>
                <h2 className='text-xl font-semibold text-slate-900 mb-4'>Address Information</h2>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div className='md:col-span-2'>
                    <label className='block text-sm font-medium text-slate-700 mb-2'>
                      Address
                    </label>
                    <input
                      type='text'
                      name='address'
                      value={formData.address}
                      onChange={handleChange}
                      className='w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500'
                      placeholder='Street address'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-slate-700 mb-2'>
                      City
                    </label>
                    <input
                      type='text'
                      name='city'
                      value={formData.city}
                      onChange={handleChange}
                      className='w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500'
                      placeholder='City'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-slate-700 mb-2'>
                      State
                    </label>
                    <input
                      type='text'
                      name='state'
                      value={formData.state}
                      onChange={handleChange}
                      className='w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500'
                      placeholder='State'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-slate-700 mb-2'>
                      Pincode
                    </label>
                    <input
                      type='text'
                      name='pincode'
                      value={formData.pincode}
                      onChange={handleChange}
                      className='w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500'
                      placeholder='Pincode'
                    />
                  </div>
                </div>
              </div>

              {/* Plan Information */}
              <div>
                <h2 className='text-xl font-semibold text-slate-900 mb-4'>Plan Information</h2>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-sm font-medium text-slate-700 mb-2'>
                      Select Plan *
                    </label>
                    <select
                      name='currentPlan'
                      value={formData.currentPlan}
                      onChange={handleChange}
                      required
                      className='w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500'
                    >
                      <option value=''>Choose a plan</option>
                      {plans.map(plan => (
                        <option key={plan._id} value={plan._id}>
                          {plan.name} - ₹{plan.price}/{plan.duration} days
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-slate-700 mb-2'>
                      Start Date *
                    </label>
                    <input
                      type='date'
                      name='startDate'
                      value={formData.startDate}
                      onChange={handleChange}
                      required
                      className='w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-slate-700 mb-2'>
                      Plan Duration (days)
                    </label>
                    <input
                      type='number'
                      name='planDuration'
                      value={formData.planDuration}
                      onChange={handleChange}
                      className='w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500'
                      placeholder='30'
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className='flex space-x-4 pt-6 border-t'>
                <button
                  type='submit'
                  disabled={loading}
                  className='flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition disabled:opacity-50'
                >
                  {loading ? 'Creating...' : 'Create Member'}
                </button>
                <button
                  type='button'
                  onClick={() => navigate('/members')}
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

export default AddMember;

