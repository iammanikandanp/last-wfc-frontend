import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Home, Users, Megaphone, Coffee, Info, ChevronDown, UserPlus, Calendar, Apple, Zap } from 'lucide-react';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFeaturesOpen, setIsFeaturesOpen] = useState(false);
  const location = useLocation();
  const dropdownRef = useRef(null);

  const [user, setUser] = useState(() => {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      import('../hooks/CustomBaseUrl').then(({ default: CustomBaseUrl }) => {
        CustomBaseUrl.get('/auth/me')
          .then(res => {
            if (res.data?.success && res.data?.user) {
              localStorage.setItem('user', JSON.stringify(res.data.user));
              setUser(res.data.user);
            }
          })
          .catch(err => console.error('Failed to fetch latest user in Navbar', err));
      });
    }

    // Listen for custom event if user is updated locally (e.g. from Edit Profile modal)
    const handleUserUpdate = (e) => {
      if (e.detail) setUser(e.detail);
    };
    window.addEventListener('userUpdated', handleUserUpdate);
    return () => window.removeEventListener('userUpdated', handleUserUpdate);
  }, []);

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
    { name: 'Diet Plan',  path: '/diet-plans', icon: Apple,    roles: ['admin','trainer','member'], desc: 'Manage nutrition & meal plans' },
    { name: 'Attendance', path: '/attendance', icon: Calendar, roles: ['admin','trainer','member'], desc: 'Track daily member attendance' },
    { name: 'Add User',   path: '/signup',     icon: UserPlus, roles: ['admin'],                   desc: 'Register new admin or trainer' },
  ];

  const navItems = allNavItems.filter(item => item.roles.includes(user?.role));
  const allowedFeatures = featureItems.filter(item => item.roles.includes(user?.role));

  const isActive = (path) => location.pathname === path;
  const isFeatureActive = allowedFeatures.some(f => isActive(f.path));

  return (
    <nav className="sticky top-0 z-50 border-b border-red-300/20 bg-[#b10909] shadow-[0_10px_30px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-3 sm:px-4">
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
          <div className="hidden md:flex items-center gap-1 lg:gap-3 flex-1 justify-center flex-wrap">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold tracking-wide transition-all duration-200 ${
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
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide transition-all duration-200 ${
                    isFeatureActive || isFeaturesOpen
                      ? 'bg-white text-[#b10909] shadow-lg shadow-black/20'
                      : 'bg-white/15 text-white hover:bg-white/25'
                  }`}
                >
                  <Zap size={13} className={isFeaturesOpen || isFeatureActive ? 'text-[#b10909]' : 'text-yellow-300'} />
                  Add Ons
                  <ChevronDown
                    size={13}
                    className={`transition-transform duration-300 ${isFeaturesOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* ── Dropdown Panel ─────────────────────────────────────── */}
                {isFeaturesOpen && (
                  <div className="absolute right-0 mt-3 w-64 rounded-2xl overflow-hidden shadow-2xl shadow-black/30 border border-white/10"
                    style={{ animation: 'dropIn 0.18s cubic-bezier(0.16,1,0.3,1)' }}>
                    
                    {/* Header */}
                    <div className="bg-[#111111] px-4 py-3 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-[#b10909] flex items-center justify-center">
                        <Zap size={12} className="text-yellow-300" />
                      </div>
                      <div>
                        <p className="text-white text-xs font-bold tracking-wide">Quick Add Ons</p>
                        <p className="text-white/40 text-[10px]">{allowedFeatures.length} available</p>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="bg-white divide-y divide-slate-50">
                      {allowedFeatures.map((item, i) => (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={`flex items-center gap-3 px-4 py-3 transition-all group ${
                            isActive(item.path)
                              ? 'bg-red-50'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          {/* Icon bubble */}
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                            isActive(item.path)
                              ? 'bg-[#b10909] text-white'
                              : 'bg-slate-100 text-slate-500 group-hover:bg-[#b10909] group-hover:text-white'
                          }`}>
                            <item.icon size={15} />
                          </div>
                          {/* Text */}
                          <div className="min-w-0">
                            <p className={`text-sm font-semibold leading-tight ${
                              isActive(item.path) ? 'text-[#b10909]' : 'text-slate-800 group-hover:text-[#b10909]'
                            }`}>
                              {item.name}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">{item.desc}</p>
                          </div>
                          {/* Active indicator */}
                          {isActive(item.path) && (
                            <div className="w-1.5 h-1.5 rounded-full bg-[#b10909] flex-shrink-0 ml-auto" />
                          )}
                        </Link>
                      ))}
                    </div>

                    {/* Footer hint */}
                    <div className="bg-slate-50 border-t border-slate-100 px-4 py-2">
                      <p className="text-[10px] text-slate-400 text-center">Click anywhere outside to close</p>
                    </div>
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
                    {user?.profilePhoto ? (
                      <img src={user.profilePhoto} alt={user.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="font-bold text-[#b10909] text-sm">{user?.name?.[0]?.toUpperCase()}</span>
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
                  <div className="px-4 pt-3 pb-1 flex items-center gap-2">
                    <Zap size={11} className="text-yellow-400" />
                    <span className="text-xs font-bold text-red-200/60 uppercase tracking-wider">Add Ons</span>
                  </div>
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
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                        isActive(item.path) ? 'bg-[#b10909]' : 'bg-white/10'
                      }`}>
                        <item.icon size={15} />
                      </div>
                      <div>
                        <p>{item.name}</p>
                        <p className="text-[11px] text-red-200/50 font-normal">{item.desc}</p>
                      </div>
                    </Link>
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Dropdown animation */}
      <style>{`
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
      `}</style>
    </nav>
  );
};

export default Navbar;