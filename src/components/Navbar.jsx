import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, Home, Users, CreditCard, Apple, Calendar, FileText, Info, Megaphone, UserPlus, TrendingDown, Coffee, ChevronLeft, ChevronRight } from 'lucide-react';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate  = useNavigate();
  const location  = useLocation();
  const [user] = React.useState(() => {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  });

  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollFades = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  const scrollByAmount = (amount) => {
    scrollRef.current?.scrollBy({ left: amount, behavior: 'smooth' });
  };

  // Keep the current page's tab in view, and keep the scroll-fade hints
  // in sync — this list can grow (new modules get appended) and won't
  // always fit the pill row, so the active tab must never end up hidden
  // off-screen with no indication there's more to scroll to.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const active = el.querySelector('a[data-active="true"]');
    active?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    updateScrollFades();

    el.addEventListener('scroll', updateScrollFades);
    window.addEventListener('resize', updateScrollFades);
    return () => {
      el.removeEventListener('scroll', updateScrollFades);
      window.removeEventListener('resize', updateScrollFades);
    };
  }, [location.pathname, updateScrollFades]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const allNavItems = [
    { name: 'Dashboard', path: '/dashboard',  icon: Home,       roles: ['admin','trainer','member'] },
    { name: 'Members',   path: '/members',    icon: Users,      roles: ['admin','trainer'] },
    { name: 'Leads',     path: '/leads',      icon: Megaphone,  roles: ['admin','trainer'] },
    { name: 'Payments',  path: '/payments',   icon: CreditCard, roles: ['admin','trainer'] },
    { name: 'Diet Plans',path: '/diet-plans', icon: Apple,      roles: ['admin','trainer','member'] },
    { name: 'Attendance',path: '/attendance', icon: Calendar,   roles: ['admin','trainer','member'] },
    { name: 'Reports',   path: '/reports',    icon: FileText,    roles: ['admin'] },
    { name: 'Expenses',  path: '/expenses',   icon: TrendingDown, roles: ['admin'] },
    { name: 'Cafeteria', path: '/cafeteria',  icon: Coffee,     roles: ['admin'] },
    { name: 'Add User',  path: '/signup',     icon: UserPlus,   roles: ['admin'] },
    { name: 'About',     path: '/about',      icon: Info,       roles: ['admin','trainer','member'] },
  ];

  const navItems = allNavItems.filter(item => item.roles.includes(user?.role));

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 border-b border-red-300/20 bg-[#b10909] shadow-[0_10px_30px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between gap-4 py-2">
          <Link to="/dashboard" className="flex flex-shrink-0 items-center gap-3 transition hover:opacity-90">
            <img src="/logo.jpeg" alt="WFC logo" className="h-12 w-12 rounded-full border-2 border-white/80 object-cover bg-white sm:h-14 sm:w-14" />
            <div className="hidden sm:block">
              <p className="text-xl font-black uppercase tracking-[0.18em] text-white leading-tight">WFC</p>
              <p className="text-xs font-medium tracking-[0.2em] text-red-100/80">Enterprises</p>
            </div>
          </Link>

          <div className="relative hidden min-w-0 flex-1 items-center justify-center md:flex">
            {canScrollLeft && (
              <>
                <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-10 bg-gradient-to-r from-[#b10909] to-transparent" />
                <button
                  onClick={() => scrollByAmount(-160)}
                  aria-label="Scroll navigation left"
                  className="absolute left-0 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60"
                >
                  <ChevronLeft size={14} />
                </button>
              </>
            )}

            <div ref={scrollRef} className="no-scrollbar flex max-w-full items-center gap-2 overflow-x-auto rounded-full border border-white/10 bg-black/15 p-1.5 shadow-inner shadow-black/30">
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  data-active={isActive(item.path)}
                  className={`flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-semibold tracking-wide transition-all duration-200 whitespace-nowrap sm:px-4 sm:text-xs ${
                    isActive(item.path)
                      ? 'bg-[#111111] text-white shadow-lg shadow-black/30'
                      : 'text-red-50/85 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <item.icon size={14} />
                  {item.name}
                </Link>
              ))}
            </div>

            {canScrollRight && (
              <>
                <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-10 bg-gradient-to-l from-[#b10909] to-transparent" />
                <button
                  onClick={() => scrollByAmount(160)}
                  aria-label="Scroll navigation right"
                  className="absolute right-0 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60"
                >
                  <ChevronRight size={14} />
                </button>
              </>
            )}
          </div>

          <div className="hidden items-center gap-5 pr-1 md:flex">
            {user && (
              <>
                <div className="ml-2 flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-2 py-1.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-black text-[#b10909] shadow-md shadow-black/20">
                    {user.name?.[0]?.toUpperCase() || 'A'}
                  </div>
                  <span className="max-w-[110px] truncate text-xs font-semibold text-white">{user.name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 rounded-full bg-[#111111] px-4 py-2 text-xs font-bold text-white transition hover:bg-black hover:text-red-200"
                >
                  <LogOut size={14} />
                  Logout
                </button>
              </>
            )}
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/10 text-white transition hover:bg-black/20 md:hidden"
            aria-label="Toggle navigation"
          >
            {isOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {isOpen && (
          <div className="border-t border-white/10 bg-[#820707] pb-4 pt-3 md:hidden">
            <div className="space-y-2">
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    isActive(item.path)
                      ? 'bg-[#111111] text-white shadow-lg shadow-black/20'
                      : 'text-red-50 hover:bg-black/10 hover:text-white'
                  }`}
                >
                  <item.icon size={16} />
                  {item.name}
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-[#b10909] transition hover:bg-red-100"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;