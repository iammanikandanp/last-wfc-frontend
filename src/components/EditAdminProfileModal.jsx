import React, { useState } from 'react';
import { X, Upload, Loader, User, Briefcase, Award, FileText, Phone, Mail } from 'lucide-react';
import CustomBaseUrl from '../hooks/CustomBaseUrl';

const EditAdminProfileModal = ({ user, setUser, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    profession: user.profession || '',
    experience: user.experience || '',
    bio: user.bio || '',
  });

  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(user.profilePhoto || '');

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const token = localStorage.getItem('token');
    const submitData = new FormData();
    Object.keys(formData).forEach(key => {
      submitData.append(key, formData[key]);
    });

    if (photo) {
      submitData.append('profilePhoto', photo);
    }

    try {
      const res = await CustomBaseUrl.put('/auth/profile', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const data = res.data;
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to update profile');
      }

      // Update local storage and state
      const updatedUser = { ...user, ...data.user };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      onClose();

    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-800">Edit Profile</h2>
          <button 
            onClick={onClose}
            className="h-8 w-8 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-100 transition shadow-sm"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Content */}
        <div className="overflow-y-auto p-6 flex-1 custom-scrollbar">
          {error && (
            <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium border border-red-100">
              {error}
            </div>
          )}

          <form id="edit-profile-form" onSubmit={handleSubmit} className="space-y-5">
            
            {/* Photo Upload */}
            <div className="flex flex-col items-center justify-center mb-6">
              <div className="relative group cursor-pointer">
                <div className="h-28 w-28 rounded-full border-4 border-white shadow-md bg-slate-100 overflow-hidden relative">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-300">
                      <User size={40} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <Upload size={20} className="mb-1" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Change</span>
                  </div>
                </div>
                <input 
                  type="file" 
                  accept="image/jpeg, image/png, image/webp" 
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={handlePhotoChange}
                />
              </div>
              <p className="text-xs text-slate-400 mt-2 font-medium">Click to change photo</p>
            </div>

            {/* Inputs */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Full Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User size={16} className="text-slate-400" />
                    </div>
                    <input 
                      type="text" 
                      name="name" 
                      value={formData.name} 
                      onChange={handleChange}
                      required
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-2 focus:ring-[#b10909] focus:border-[#b10909] block pl-10 p-2.5 outline-none transition"
                      placeholder="Jane Doe"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Profession</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Briefcase size={16} className="text-slate-400" />
                    </div>
                    <input 
                      type="text" 
                      name="profession" 
                      value={formData.profession} 
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-2 focus:ring-[#b10909] focus:border-[#b10909] block pl-10 p-2.5 outline-none transition"
                      placeholder="Admin / Operations"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Experience</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Award size={16} className="text-slate-400" />
                  </div>
                  <input 
                    type="text" 
                    name="experience" 
                    value={formData.experience} 
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-2 focus:ring-[#b10909] focus:border-[#b10909] block pl-10 p-2.5 outline-none transition"
                    placeholder="e.g. 5+ Years"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Bio</label>
                <div className="relative">
                  <div className="absolute top-3 left-3 pointer-events-none">
                    <FileText size={16} className="text-slate-400" />
                  </div>
                  <textarea 
                    name="bio" 
                    value={formData.bio} 
                    onChange={handleChange}
                    rows="3"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-2 focus:ring-[#b10909] focus:border-[#b10909] block pl-10 p-2.5 outline-none transition resize-none"
                    placeholder="Short professional description..."
                  ></textarea>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Email</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail size={16} className="text-slate-400" />
                    </div>
                    <input 
                      type="email" 
                      name="email" 
                      value={formData.email} 
                      onChange={handleChange}
                      required
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-2 focus:ring-[#b10909] focus:border-[#b10909] block pl-10 p-2.5 outline-none transition"
                      placeholder="admin@wfc.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Phone</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone size={16} className="text-slate-400" />
                    </div>
                    <input 
                      type="tel" 
                      name="phone" 
                      value={formData.phone} 
                      onChange={handleChange}
                      required
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-2 focus:ring-[#b10909] focus:border-[#b10909] block pl-10 p-2.5 outline-none transition"
                      placeholder="+1 234 567 8900"
                    />
                  </div>
                </div>
              </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3">
          <button 
            type="button" 
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="edit-profile-form"
            disabled={loading}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-[#b10909] hover:bg-red-800 rounded-xl transition flex items-center gap-2 shadow-md shadow-red-900/20 disabled:opacity-70"
          >
            {loading ? <><Loader size={16} className="animate-spin" /> Saving...</> : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditAdminProfileModal;
