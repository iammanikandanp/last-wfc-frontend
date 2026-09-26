import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import CustomBaseUrl from '../hooks/CustomBaseUrl';

const Login = () => {
  const [role, setRole] = useState('member'); // Default to member
  const [isFading, setIsFading] = useState(false); // For smooth transition
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [dob, setDob] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
  }, []);

  const tapCount = useRef(0);
  const lastTapTime = useRef(0);

  const switchRole = (newRole) => {
    if (role === newRole) return;
    setIsFading(true);
    setTimeout(() => {
      setRole(newRole);
      setError('');
      setIsFading(false);
    }, 250);
  };

  const handleLogoTap = () => {
    const now = Date.now();
    if (now - lastTapTime.current > 600) {
      tapCount.current = 1;
    } else {
      tapCount.current += 1;
      if (tapCount.current === 3) {
        if (role === 'member') {
          switchRole('admin');
        }
        tapCount.current = 0; 
      }
    }
    lastTapTime.current = now;
  };

  const handleBackToMember = () => {
    switchRole('member');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!role) {
      setError('Please select a role.');
      setLoading(false);
      return;
    }

    try {
      if (role === 'member') {
        if (!mobile) {
          setError('Please enter your mobile number.');
          setLoading(false);
          return;
        }
        if (!dob) {
          setError('Please enter your date of birth.');
          setLoading(false);
          return;
        }

        const response = await CustomBaseUrl.post('/member/auth/login', {
          mobile,
          password: dob,
        });

        if (response.data.success) {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.member));
          navigate(`/members/${response.data.member.id}`);
        }
      } else {
        // Admin or Trainer login
        const payload = {
          password,
          email: identifier,
          username: identifier,
          role,
        };

        const response = await CustomBaseUrl.post('/auth/login', payload);

        if (response.data.success) {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.user));
          navigate('/dashboard');
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen relative flex items-center justify-center md:justify-end overflow-hidden font-sans bg-black'>
      
      {/* FULL-SCREEN BACKGROUND */}
      <div 
        className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ease-in-out ${
          mounted ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ backgroundImage: "url('/Gym_bg.png')" }}
      >
        {/* Layered Cinematic Gradients */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-black/40 to-black/90 mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] md:backdrop-blur-none"></div>
      </div>

      {/* LOGO (TOP LEFT) */}
      <div className="absolute top-6 left-6 md:top-10 md:left-10 z-50 flex items-center gap-4">
        <div 
          className='bg-black/50 backdrop-blur-md p-1.5 rounded-full border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.5)] cursor-pointer transition-all duration-300 transform active:scale-95 hover:scale-105 hover:bg-black/70 hover:border-white/30'
          onClick={handleLogoTap}
          title="WFC Enterprises"
        >
          <img src='/logo.jpeg' alt='WFC logo' className='w-12 h-12 md:w-14 md:h-14 rounded-full object-cover' />
        </div>
        <h1 className='text-xl md:text-2xl font-black text-white tracking-widest uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]'>
          WFC <span className="text-red-600 font-light">Enterprises</span>
        </h1>
      </div>

      {/* RIGHT SIDE: GLASSMORPHISM LOGIN CARD */}
      <div 
        className={`relative z-10 w-full max-w-md px-6 md:px-0 md:mr-24 lg:mr-32 transform transition-all duration-1000 ease-out delay-150 ${
          mounted ? 'translate-x-0 opacity-100' : 'translate-x-12 opacity-0'
        }`}
      >
        <div className="w-full bg-black/60 backdrop-blur-xl p-8 md:p-10 rounded-[2rem] shadow-[0_8px_40px_rgb(0,0,0,0.6)] border border-white/10">
          
          <div className={`transition-opacity duration-300 ease-in-out ${isFading ? 'opacity-0' : 'opacity-100'}`}>
            
            {/* Header */}
            <div className='mb-8 flex items-center justify-between'>
              <h2 className='text-2xl md:text-3xl font-extrabold text-white tracking-tight drop-shadow-md'>
                {role === 'member' ? 'Member Login' : 'Admin Login'}
              </h2>
              {role !== 'member' && (
                <button 
                  onClick={handleBackToMember}
                  type="button"
                  className='text-xs md:text-sm font-semibold text-slate-300 hover:text-white flex items-center gap-1 transition-all duration-300 hover:-translate-x-1 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg hover:bg-white/10'
                >
                  ← Back
                </button>
              )}
            </div>

            {/* Trainer / Admin toggle ONLY in hidden mode */}
            {role !== 'member' && (
              <div className='flex gap-2 mb-8 bg-black/40 border border-white/10 p-1.5 rounded-xl'>
                {['admin', 'trainer'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => switchRole(r)}
                    className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-bold transition-all duration-300 capitalize transform active:scale-95 ${
                      role === r
                        ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]'
                        : 'text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className='mb-6 p-4 bg-red-900/50 backdrop-blur-sm border-l-4 border-red-500 text-red-200 rounded-r-lg text-sm font-medium animate-pulse shadow-sm'>
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className='space-y-6'>
              {role === 'member' ? (
                <>
                  {/* Mobile */}
                  <div className='group'>
                    <label className='block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 transition-colors group-focus-within:text-red-500'>
                      Mobile Number
                    </label>
                    <div className='relative'>
                      <Mail className='absolute left-4 top-3.5 text-slate-500 transition-colors group-focus-within:text-red-500' size={20} />
                      <input
                        type='text'
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        placeholder='Enter your mobile number'
                        className='w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 focus:bg-white/10 transition-all duration-300 text-white font-medium placeholder-slate-500 shadow-inner'
                      />
                    </div>
                  </div>

                  {/* DOB */}
                  <div className='group'>
                    <label className='block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 transition-colors group-focus-within:text-red-500'>
                      Date of Birth
                    </label>
                    <div className='relative'>
                      <Lock className='absolute left-4 top-3.5 text-slate-500 transition-colors group-focus-within:text-red-500' size={20} />
                      <input
                        type='date'
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className='w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 focus:bg-white/10 text-white uppercase transition-all duration-300 font-medium placeholder-slate-500 shadow-inner'
                        style={{ colorScheme: 'dark' }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Username/Email */}
                  <div className='group'>
                    <label className='block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 transition-colors group-focus-within:text-red-500'>
                      Username or Email
                    </label>
                    <div className='relative'>
                      <Mail className='absolute left-4 top-3.5 text-slate-500 transition-colors group-focus-within:text-red-500' size={20} />
                      <input
                        type='text'
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder='Enter your username or email'
                        className='w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 focus:bg-white/10 transition-all duration-300 text-white font-medium placeholder-slate-500 shadow-inner'
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className='group'>
                    <label className='block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 transition-colors group-focus-within:text-red-500'>
                      Password
                    </label>
                    <div className='relative'>
                      <Lock className='absolute left-4 top-3.5 text-slate-500 transition-colors group-focus-within:text-red-500' size={20} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder='Enter your password'
                        className='w-full pl-12 pr-12 py-3.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 focus:bg-white/10 transition-all duration-300 text-white font-medium placeholder-slate-500 shadow-inner'
                      />
                      <button
                        type='button'
                        onClick={() => setShowPassword(!showPassword)}
                        className='absolute right-4 top-3.5 text-slate-500 hover:text-white transition-colors duration-300'
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Submit Button */}
              <button
                type='submit'
                disabled={loading}
                className='w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-4 rounded-xl font-bold tracking-wide hover:from-red-500 hover:to-red-600 transition-all duration-300 transform active:scale-[0.98] shadow-[0_8px_20px_rgba(220,38,38,0.4)] hover:shadow-[0_8px_25px_rgba(220,38,38,0.6)] disabled:opacity-70 disabled:hover:scale-100 disabled:hover:shadow-none mt-8 border border-red-500/30'
              >
                {loading ? (
                  <span className='flex items-center justify-center gap-2'>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Authenticating...
                  </span>
                ) : (
                  'Login'
                )}
              </button>
            </form>

            {/* Footer (Forgot Password) */}
            <div className='mt-8 text-center'>
              <a href='/forgot-password' className='text-sm text-slate-400 font-semibold hover:text-red-500 transition-colors duration-300 hover:underline underline-offset-4'>
                Forgot password?
              </a>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;

