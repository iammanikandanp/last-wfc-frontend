import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Edit2, TrendingDown, LogOut, Briefcase, Mail, Phone, UserCheck, FileText } from 'lucide-react';
import EditAdminProfileModal from './EditAdminProfileModal';

const AdminProfile = ({ user, setUser }) => {
  const navigate = useNavigate();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Profile completion calculation
  const getCompletionPercentage = () => {
    let count = 0;
    const fields = ['name', 'email', 'phone', 'profession', 'experience', 'bio', 'profilePhoto'];
    fields.forEach(f => {
      if (user[f] && user[f] !== '') count++;
    });
    return Math.round((count / fields.length) * 100);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in pb-20">
      
      {/* Header Profile Section */}
      <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden border border-slate-100">
        
        {/* Cover Photo / Header background */}
        <div className="h-32 bg-gradient-to-r from-[#b10909] to-red-800 relative">
          <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/30 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm">
            <UserCheck size={14} /> Admin
          </div>
        </div>

        <div className="px-6 pb-6 relative">
          {/* Avatar */}
          <div className="flex justify-between items-end -mt-16 mb-4">
            <div className="relative group">
              <div className="h-32 w-32 rounded-full border-4 border-white bg-slate-100 overflow-hidden shadow-lg flex items-center justify-center relative">
                {user.profilePhoto ? (
                  <img src={user.profilePhoto} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-5xl font-bold text-[#b10909]">{user.name?.[0]?.toUpperCase()}</span>
                )}
              </div>
            </div>
            
            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="mb-2 bg-slate-900 text-white px-5 py-2.5 rounded-full font-semibold text-sm hover:bg-slate-800 transition flex items-center gap-2 shadow-md shadow-slate-900/20"
            >
              <Edit2 size={16} /> Edit Profile
            </button>
          </div>

          {/* User Info */}
          <div>
            <h1 className="text-2xl font-bold text-slate-900 leading-tight">{user.name}</h1>
            <p className="text-slate-500 font-medium text-sm flex items-center gap-1.5 mt-0.5">
              <Briefcase size={14} />
              {user.profession || "Admin"} • {user.experience ? `${user.experience} Experience` : "No experience listed"}
            </p>
          </div>

          {/* Bio */}
          {user.bio ? (
            <div className="mt-5 text-slate-600 text-sm leading-relaxed whitespace-pre-wrap bg-slate-50 p-4 rounded-2xl border border-slate-100">
              {user.bio}
            </div>
          ) : (
            <div className="mt-5 text-slate-400 text-sm italic bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-2 cursor-pointer hover:bg-slate-100 transition" onClick={() => setIsEditModalOpen(true)}>
              <Edit2 size={14} /> Add a short bio to complete your profile
            </div>
          )}
        </div>
      </div>

      {/* Completion indicator */}
      <div className="mt-6 bg-white p-5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex items-center gap-4">
        <div className="flex-1">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-bold text-slate-800">Profile Completion</h3>
            <span className="text-xs font-bold text-[#b10909]">{getCompletionPercentage()}%</span>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#b10909] to-red-600 rounded-full transition-all duration-500" style={{ width: `${getCompletionPercentage()}%` }}></div>
          </div>
        </div>
      </div>

      {/* Contact & Info */}
      <div className="mt-6 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800">Professional Information</h3>
        </div>
        <div className="p-4 space-y-1">
          <div className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-2xl transition">
            <div className="h-10 w-10 rounded-full bg-red-50 text-[#b10909] flex items-center justify-center flex-shrink-0">
              <Mail size={18} />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Email Address</p>
              <p className="text-sm font-semibold text-slate-800">{user.email || "Not provided"}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-2xl transition">
            <div className="h-10 w-10 rounded-full bg-red-50 text-[#b10909] flex items-center justify-center flex-shrink-0">
              <Phone size={18} />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Phone Number</p>
              <p className="text-sm font-semibold text-slate-800">{user.phone || "Not provided"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Shortcuts */}
      <div className="mt-6 flex flex-col gap-3">
        <Link 
          to="/reports" 
          className="bg-white p-4 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 flex items-center justify-between hover:border-red-200 hover:shadow-md transition group"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-red-50 text-[#b10909] flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileText size={18} />
            </div>
            <span className="font-semibold text-slate-800">Business Reports</span>
          </div>
          <div className="text-slate-400 group-hover:text-[#b10909] transition">→</div>
        </Link>

        <Link 
          to="/expenses" 
          className="bg-white p-4 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 flex items-center justify-between hover:border-red-200 hover:shadow-md transition group"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-red-50 text-[#b10909] flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingDown size={18} />
            </div>
            <span className="font-semibold text-slate-800">Expense Reports</span>
          </div>
          <div className="text-slate-400 group-hover:text-[#b10909] transition">→</div>
        </Link>
      </div>

      {/* Logout */}
      <div className="mt-12 flex justify-center">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 text-slate-400 font-medium text-sm hover:text-[#b10909] transition px-4 py-2 rounded-full hover:bg-red-50"
        >
          <LogOut size={16} /> Logout
        </button>
      </div>

      {isEditModalOpen && (
        <EditAdminProfileModal 
          user={user} 
          setUser={setUser} 
          onClose={() => setIsEditModalOpen(false)} 
        />
      )}
    </div>
  );
};

export default AdminProfile;
