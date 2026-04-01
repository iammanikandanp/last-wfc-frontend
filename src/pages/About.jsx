import React from 'react';
import Navbar from '../components/Navbar';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';

const About = () => {
  return (
    <div>
      <Navbar />
      <div className='min-h-screen bg-slate-50'>
        <div className='max-w-4xl mx-auto px-4 py-8'>
          {/* Hero Section */}
          <div className='bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg shadow-lg p-8 mb-8 text-center'>
            <div className='text-5xl mb-4'>💪</div>
            <h1 className='text-4xl font-bold mb-2'>WFC – Wolverine Fitness Club</h1>
            <p className='text-lg'>Your Ultimate Fitness Destination</p>
          </div>

          {/* About Us */}
          <div className='bg-white rounded-lg shadow-md p-8 mb-8'>
            <h2 className='text-2xl font-bold text-slate-900 mb-4'>About Us</h2>
            <p className='text-slate-600 leading-relaxed mb-4'>
              Welcome to WFC – Wolverine Fitness Club, your premier destination for comprehensive fitness and wellness solutions. 
              We are dedicated to helping individuals achieve their health and fitness goals through state-of-the-art facilities, 
              expert trainers, and personalized programs.
            </p>
            <p className='text-slate-600 leading-relaxed'>
              Since our establishment, we have been committed to providing premium fitness services with a focus on member satisfaction, 
              progress tracking, and holistic wellness. Our modern management system ensures seamless operations and member experience.
            </p>
          </div>

          {/* Features */}
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'>
            <div className='bg-white rounded-lg shadow-md p-6'>
              <h3 className='text-xl font-bold text-slate-900 mb-3'>🏋️ Modern Facilities</h3>
              <p className='text-slate-600'>State-of-the-art gym equipment and training areas designed for maximum performance.</p>
            </div>
            <div className='bg-white rounded-lg shadow-md p-6'>
              <h3 className='text-xl font-bold text-slate-900 mb-3'>👥 Expert Trainers</h3>
              <p className='text-slate-600'>Certified and experienced trainers dedicated to your fitness journey and success.</p>
            </div>
            <div className='bg-white rounded-lg shadow-md p-6'>
              <h3 className='text-xl font-bold text-slate-900 mb-3'>📊 Tracking System</h3>
              <p className='text-slate-600'>Advanced member management and progress tracking for personalized fitness plans.</p>
            </div>
          </div>

          {/* Services */}
          <div className='bg-white rounded-lg shadow-md p-8 mb-8'>
            <h2 className='text-2xl font-bold text-slate-900 mb-6'>Our Services</h2>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div className='flex space-x-4'>
                <div className='text-3xl'>🏋️</div>
                <div>
                  <h3 className='font-bold text-slate-900'>Gym Membership Plans</h3>
                  <p className='text-slate-600 text-sm'>Flexible plans tailored to your fitness goals and budget</p>
                </div>
              </div>
              <div className='flex space-x-4'>
                <div className='text-3xl'>👨‍🏫</div>
                <div>
                  <h3 className='font-bold text-slate-900'>Personal Training</h3>
                  <p className='text-slate-600 text-sm'>One-on-one sessions with certified trainers</p>
                </div>
              </div>
              <div className='flex space-x-4'>
                <div className='text-3xl'>🥗</div>
                <div>
                  <h3 className='font-bold text-slate-900'>Diet Planning</h3>
                  <p className='text-slate-600 text-sm'>Customized nutrition plans for optimal results</p>
                </div>
              </div>
              <div className='flex space-x-4'>
                <div className='text-3xl'>📈</div>
                <div>
                  <h3 className='font-bold text-slate-900'>Progress Tracking</h3>
                  <p className='text-slate-600 text-sm'>Body measurements and transformation photos</p>
                </div>
              </div>
            </div>
          </div>

          {/* Membership Plans */}
          <div className='bg-white rounded-lg shadow-md p-8 mb-8'>
            <h2 className='text-2xl font-bold text-slate-900 mb-6'>Membership Plans</h2>
            <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
              <div className='border rounded-lg p-4 text-center hover:shadow-lg transition'>
                <h3 className='font-bold text-slate-900 mb-2'>Guest Plan</h3>
                <p className='text-2xl font-bold text-red-600 mb-2'>₹150</p>
                <p className='text-sm text-slate-600'>1 Day</p>
              </div>
              <div className='border rounded-lg p-4 text-center hover:shadow-lg transition border-red-500 bg-red-50'>
                <h3 className='font-bold text-slate-900 mb-2'>Basic Plan</h3>
                <p className='text-2xl font-bold text-red-600 mb-2'>₹1000</p>
                <p className='text-sm text-slate-600'>1 Month</p>
              </div>
              <div className='border rounded-lg p-4 text-center hover:shadow-lg transition'>
                <h3 className='font-bold text-slate-900 mb-2'>Standard Plan</h3>
                <p className='text-2xl font-bold text-red-600 mb-2'>₹2500</p>
                <p className='text-sm text-slate-600'>3 Months</p>
              </div>
              <div className='border rounded-lg p-4 text-center hover:shadow-lg transition'>
                <h3 className='font-bold text-slate-900 mb-2'>Premium Plan</h3>
                <p className='text-2xl font-bold text-red-600 mb-2'>₹4500</p>
                <p className='text-sm text-slate-600'>6 Months</p>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className='bg-white rounded-lg shadow-md p-8'>
            <h2 className='text-2xl font-bold text-slate-900 mb-6'>Contact Us</h2>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div className='flex space-x-4'>
                <MapPin className='text-red-600 flex-shrink-0' size={24} />
                <div>
                  <h3 className='font-bold text-slate-900'>Location</h3>
                  <p className='text-slate-600'>123 Fitness Street, Gym City, State 12345</p>
                </div>
              </div>
              <div className='flex space-x-4'>
                <Phone className='text-red-600 flex-shrink-0' size={24} />
                <div>
                  <h3 className='font-bold text-slate-900'>Phone</h3>
                  <p className='text-slate-600'>+1 (555) 123-4567</p>
                </div>
              </div>
              <div className='flex space-x-4'>
                <Mail className='text-red-600 flex-shrink-0' size={24} />
                <div>
                  <h3 className='font-bold text-slate-900'>Email</h3>
                  <p className='text-slate-600'>info@wfcfitness.com</p>
                </div>
              </div>
              <div className='flex space-x-4'>
                <Clock className='text-red-600 flex-shrink-0' size={24} />
                <div>
                  <h3 className='font-bold text-slate-900'>Hours</h3>
                  <p className='text-slate-600'>Mon - Sun: 6:00 AM - 10:00 PM</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
