import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, Home, Users, CreditCard, Apple, Calendar, FileText, Info, Megaphone } from 'lucide-react';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate  = useNavigate();
  const location  = useLocation();
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) setUser(JSON.parse(u));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard',  icon: Home      },
    { name: 'Members',   path: '/members',    icon: Users     },
    { name: 'Leads',     path: '/leads',      icon: Megaphone },
    { name: 'Payments',  path: '/payments',   icon: CreditCard},
    { name: 'Diet Plans',path: '/diet-plans', icon: Apple     },
    { name: 'Attendance',path: '/attendance', icon: Calendar  },
    { name: 'Reports',   path: '/reports',    icon: FileText  },
    { name: 'About',     path: '/about',      icon: Info      },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-14">

          <Link to="/dashboard" className="flex items-center gap-2 font-bold text-lg flex-shrink-0">
            <div className="bg-red-600 p-1.5 rounded-lg text-base">💪</div>
            <span className="hidden sm:block">WFC Fitness</span>
          </Link>

          <div className="hidden md:flex items-center gap-0.5 overflow-x-auto">
            {navItems.map(item => (
              <Link key={item.path} to={item.path}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                  isActive(item.path) ? 'bg-red-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}>
                <item.icon size={13} />
                {item.name}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2 flex-shrink-0">
            {user && (
              <>
                <div className="w-7 h-7 bg-red-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {user.name?.[0]?.toUpperCase() || 'A'}
                </div>
                <span className="text-xs text-slate-300 max-w-[80px] truncate">{user.name}</span>
                <button onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 rounded-lg hover:bg-red-700 transition text-xs font-semibold">
                  <LogOut size={13} /> Logout
                </button>
              </>
            )}
          </div>

          <button onClick={() => setIsOpen(!isOpen)} className="md:hidden p-1">
            {isOpen ? <X size={22}/> : <Menu size={22}/>}
          </button>
        </div>

        {isOpen && (
          <div className="md:hidden pb-4 pt-3 space-y-1 border-t border-slate-700">
            {navItems.map(item => (
              <Link key={item.path} to={item.path} onClick={() => setIsOpen(false)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition ${
                  isActive(item.path) ? 'bg-red-600 text-white' : 'text-slate-300 hover:bg-slate-700'
                }`}>
                <item.icon size={15}/> {item.name}
              </Link>
            ))}
            <button onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2.5 bg-red-600 rounded-lg hover:bg-red-700 transition text-sm font-semibold mt-2">
              <LogOut size={15}/> Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;