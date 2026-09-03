import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import AdminProfile from '../components/AdminProfile';
import { Navigate } from 'react-router-dom';

const Profile = () => {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));

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
