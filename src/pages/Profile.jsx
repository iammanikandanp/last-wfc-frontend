import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import AdminProfile from '../components/AdminProfile';
import { Navigate } from 'react-router-dom';

const Profile = () => {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));

  React.useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      import('../hooks/CustomBaseUrl').then(({ default: CustomBaseUrl }) => {
        CustomBaseUrl.get('/auth/me')
          .then(res => {
            if (res.data?.success && res.data?.user) {
              localStorage.setItem('user', JSON.stringify(res.data.user));
              setUser(res.data.user);
              
              // Dispatch event to notify other components (like Navbar)
              window.dispatchEvent(new CustomEvent('userUpdated', { detail: res.data.user }));
            }
          })
          .catch(err => console.error('Failed to fetch latest user in Profile', err));
      });
    }
  }, []);

  if (!user) return <Navigate to="/login" />;

  return (
    <div className="min-h-screen bg-slate-300  flex flex-col">
      <Navbar />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        {user.role === 'admin' ? (
          <AdminProfile user={user} setUser={setUser} />
        ) : (
          <div className="max-w-sm mx-auto mt-10 p-6 bg-white rounded-3xl shadow-sm border border-slate-100 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-[#b10909] font-black text-3xl shadow-inner">
              {user.profilePhoto ? (
                <img src={user.profilePhoto} alt={user.name} className="w-full h-full object-cover rounded-full" />
              ) : (
                user.name?.[0]?.toUpperCase()
              )}
            </div>
            <h2 className="text-xl font-black text-slate-800">{user.name}</h2>
            <p className="text-slate-500 font-medium text-sm mb-1 capitalize">{user.role}</p>
            <p className="text-slate-400 text-xs mb-8">{user.email || user.emails || ''}</p>
            
            <button
              onClick={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                window.location.href = "/login";
              }}
              className="w-full py-2.5 bg-red-50 text-red-600 rounded-xl font-bold text-sm border border-red-100 hover:bg-red-100 hover:text-red-700 transition flex justify-center items-center gap-2"
            >
              Logout
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Profile;
