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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1 overflow-y-auto">
        {user.role === 'admin' ? (
          <AdminProfile user={user} setUser={setUser} />
        ) : user.role === 'trainer' ? (
          <div className="p-8 text-center text-slate-500">Trainer Profile (Coming Soon)</div>
        ) : (
          <div className="p-8 text-center text-slate-500">Member Profile (Coming Soon)</div>
        )}
      </main>
    </div>
  );
};

export default Profile;
