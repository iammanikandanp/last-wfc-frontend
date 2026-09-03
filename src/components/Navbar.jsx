import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Home, Users, Megaphone, Coffee, Info, ChevronDown, UserPlus, Calendar, Apple } from 'lucide-react';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFeaturesOpen, setIsFeaturesOpen] = useState(false);
  const location = useLocation();
  const dropdownRef = useRef(null);

  const [user] = React.useState(() => {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsFeaturesOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdown and mobile menu on route change
  useEffect(() => {
    setIsFeaturesOpen(false);
    setIsOpen(false);
  }, [location.pathname]);

  const allNavItems = [
    { name: 'Dashboard', path: '/dashboard',  icon: Home,       roles: ['admin','trainer','member'] },
    { name: 'Members',   path: '/members',    icon: Users,      roles: ['admin','trainer'] },
    { name: 'Leads',     path: '/leads',      icon: Megaphone,  roles: ['admin','trainer'] },
    { name: 'Cafeteria', path: '/cafeteria',  icon: Coffee,     roles: ['admin'] },
    { name: 'About Us',  path: '/about',      icon: Info,       roles: ['admin','trainer','member'] },
  ];

  const featureItems = [
    { name: 'Diet Plan', path: '/diet-plans', icon: Apple,    roles: ['admin','trainer','member'] },
    { name: 'Attendance',path: '/attendance', icon: Calendar, roles: ['admin','trainer','member'] },
    { name: 'Add User',  path: '/signup',     icon: UserPlus, roles: ['admin'] },
  ];

  const navItems = allNavItems.filter(item => item.roles.includes(user?.role));
  const allowedFeatures = featureItems.filter(item => item.roles.includes(user?.role));

  const isActive = (path) => location.pathname === path;
  const isFeatureActive = allowedFeatures.some(f => isActive(f.path));

  return (
    <nav className="sticky top-0 z-50 border-b border-red-300/20 bg-[#b10909] shadow-[0_10px_30px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between gap-4 py-2">
          
          {/* Logo */}
          <Link to="/dashboard" className="flex flex-shrink-0 items-center gap-3 transition hover:opacity-90">
            <img src="/logo.jpeg" alt="WFC logo" className="h-12 w-12 rounded-full border-2 border-white/80 object-cover bg-white sm:h-14 sm:w-14" />
            <div className="hidden sm:block">
              <p className="text-xl font-black uppercase tracking-[0.18em] text-white leading-tight">WFC</p>
              <p className="text-xs font-medium tracking-[0.2em] text-red-100/80">Enterprises</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2 lg:gap-4 flex-1 justify-center">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold tracking-wide transition-all duration-200 ${
                  isActive(item.path)
                    ? 'bg-[#111111] text-white shadow-lg shadow-black/30'
                    : 'text-red-50/85 hover:bg-white/10 hover:text-white'
                }`}
              >
                <item.icon size={16} />
                {item.name}
              </Link>
            ))}

            {allowedFeatures.length > 0 && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsFeaturesOpen(!isFeaturesOpen)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold tracking-wide transition-all duration-200 ${
                    isFeatureActive || isFeaturesOpen
                      ? 'bg-[#111111] text-white shadow-lg shadow-black/30'
                      : 'text-red-50/85 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  Features
                  <ChevronDown size={14} className={`transition-transform duration-200 ${isFeaturesOpen ? 'rotate-180' : ''}`} />
                </button>

                {isFeaturesOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white shadow-xl shadow-black/20 border border-slate-100 overflow-hidden py-1 animate-fade-in">
                    {allowedFeatures.map(item => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm font-semibold transition-colors ${
                          isActive(item.path)
                            ? 'bg-red-50 text-red-700'
                            : 'text-slate-700 hover:bg-slate-50 hover:text-red-600'
                        }`}
                      >
                        <item.icon size={16} />
                        {item.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Profile & Mobile Toggle */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {user && (
              <Link to="/profile" className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-2 py-1.5 hover:bg-white/20 transition cursor-pointer">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-black text-[#b10909] shadow-md shadow-black/20 overflow-hidden">
                  {user.profilePhoto ? (
                    <img src={user.profilePhoto} alt={user.name} className="h-full w-full object-cover" />
                  ) : (
                    user.name?.[0]?.toUpperCase() || 'A'
                  )}
                </div>
                <span className="hidden sm:block max-w-[110px] truncate text-xs font-semibold text-white pr-1">{user.name}</span>
              </Link>
            )}

            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/10 text-white transition hover:bg-black/20 md:hidden"
              aria-label="Toggle navigation"
            >
              {isOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="border-t border-white/10 bg-[#820707] pb-4 pt-3 md:hidden">
            <div className="space-y-1">
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    isActive(item.path)
                      ? 'bg-[#111111] text-white shadow-lg shadow-black/20'
                      : 'text-red-50 hover:bg-black/10 hover:text-white'
                  }`}
                >
                  <item.icon size={18} />
                  {item.name}
                </Link>
              ))}
              
              {allowedFeatures.length > 0 && (
                <>
                  <div className="px-4 py-2 mt-2 text-xs font-bold text-red-200/50 uppercase tracking-wider">Features</div>
                  {allowedFeatures.map(item => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                        isActive(item.path)
                          ? 'bg-[#111111] text-white shadow-lg shadow-black/20'
                          : 'text-red-50 hover:bg-black/10 hover:text-white'
                      }`}
                    >
                      <item.icon size={18} />
                      {item.name}
                    </Link>
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;