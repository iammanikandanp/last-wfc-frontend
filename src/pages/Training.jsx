import React, { useState, useEffect } from 'react';
import { Dumbbell, Plus, Edit, Trash2 } from 'lucide-react';
import CustomBaseUrl from '../hooks/CustomBaseUrl';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';

const Training = () => {
  const token = localStorage.getItem('token');
  const navigate = useNavigate();
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrainers();
  }, []);

  const fetchTrainers = async () => {
    try {
      const response = await CustomBaseUrl.get('/trainers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setTrainers(response.data.trainers);
      }
    } catch (error) {
      console.error('Error fetching trainers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this trainer?')) {
      try {
        const response = await CustomBaseUrl.delete(`/trainers/${id}`);
        if (response.data.success) {
          setTrainers(trainers.filter(t => t._id !== id));
          alert('Trainer deleted successfully');
        }
      } catch (error) {
        console.error('Error deleting trainer:', error);
        alert('Failed to delete trainer: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  return (
    <div>
      <Navbar />
      <div className='min-h-screen bg-slate-50'>
        <div className='max-w-7xl mx-auto px-4 py-8'>
          {/* Header */}
          <div className='flex justify-between items-center mb-8'>
            <div>
              <h1 className='text-3xl font-bold text-slate-900'>Personal Training</h1>
              <p className='text-slate-600 mt-1'>Manage trainers and training sessions</p>
            </div>
            <button
              onClick={() => navigate('/training/new')}
              className='flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition'
            >
              <Plus size={20} />
              <span>Add Trainer</span>
            </button>
          </div>

          {/* Trainers Grid */}
          {loading ? (
            <div className='text-center py-12'>Loading trainers...</div>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
              {trainers.map((trainer) => (
                <div key={trainer._id} className='bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition'>
                  <div className='flex items-center space-x-3 mb-4'>
                    <div className='bg-purple-100 p-3 rounded-lg'>
                      <Dumbbell size={24} className='text-purple-600' />
                    </div>
                    <div>
                      <h3 className='font-semibold text-slate-900'>{trainer.userId?.name}</h3>
                      <p className='text-sm text-slate-600'>{trainer.yearsOfExperience || 0} years exp</p>
                    </div>
                  </div>

                  <div className='space-y-2 mb-4 text-sm'>
                    <div>
                      <span className='text-slate-600'>Email: </span>
                      <span className='font-semibold'>{trainer.userId?.email}</span>
                    </div>
                    <div>
                      <span className='text-slate-600'>Hourly Rate: </span>
                      <span className='font-semibold'>₹{trainer.hourlyRate || 'N/A'}</span>
                    </div>
                    <div>
                      <span className='text-slate-600'>Rating: </span>
                      <span className='font-semibold'>⭐ {trainer.rating || 0}</span>
                    </div>
                  </div>

                  {trainer.specialization && trainer.specialization.length > 0 && (
                    <div className='mb-4'>
                      <p className='text-xs text-slate-600 mb-2'>Specializations:</p>
                      <div className='flex flex-wrap gap-1'>
                        {trainer.specialization.map((spec, idx) => (
                          <span key={idx} className='px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded'>
                            {spec}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className='flex space-x-2 pt-4 border-t'>
                    <button
                      onClick={() => navigate(`/training/${trainer._id}/edit`)}
                      className='flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition'
                    >
                      <Edit size={16} />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(trainer._id)}
                      className='flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition'
                    >
                      <Trash2 size={16} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && trainers.length === 0 && (
            <div className='text-center py-12 bg-white rounded-lg'>
              <Dumbbell size={48} className='mx-auto text-slate-300 mb-4' />
              <p className='text-slate-500 text-lg'>No trainers found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Training;

