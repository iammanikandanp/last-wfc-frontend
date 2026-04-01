import React, { useState } from 'react';
import logo from "/logo.jpeg";
import { FaBars } from "react-icons/fa";
import {Link} from "react-router-dom"
import "../App.css";

export const Navbar = () => {
  const [open, setOpen] = useState(false);

  const toggleOpen = () => {
    setOpen(!open);
  };

  const toggleClose = () => {
    setOpen(false);
  };

  return (
    <>
      <nav className='w-screen bg-black p-3 fixed top-0 left-0 z-50 shadow-md overflow-x-hidden'>
        <div className="flex justify-between items-center mr-4">
          <div>
            <img src={logo} alt="Logo" className='w-[60px] h-[60px]' />
          </div>
          <div>
            <ul className='flex flex-wrap gap-5 text-xl cursor-pointer items-center max-[600px]:gap-3'>
             
              <li className='text-white hover:text-red-500 max-[600px]:hidden'>
                <Link to="/">Home</Link>
              </li>
              <li className='text-white hover:text-red-500 max-[600px]:hidden'>
                <Link to="/register">Register</Link>
              </li>
              <li className='text-white hover:text-red-500 max-[600px]:hidden'>
                <Link to="Service">Services</Link>
              </li>
              <li className='text-white hover:text-red-500 max-[600px]:hidden'>
                <Link to="membership">Membership</Link>
              </li>
              <li className='text-white hover:text-red-500 max-[600px]:hidden'>
                <Link to="FAQ">FAQ</Link>
              </li>
              <li className='text-white hover:text-red-500 max-[600px]:hidden'>
                <Link to="contact">Contact</Link>
              </li>

        
              <li className='text-white hover:text-red-500 min-[600px]:hidden'>
                <button className='cursor-pointer text-2xl' onClick={toggleOpen}>
                  <FaBars />
                </button>
              </li>
            </ul>
          </div>
        </div>
      </nav>

    
      {open && (
        <ul className="dropdown-menu lg:hidden bg-black text-white px-4 py-2 space-y-2 fixed top-[80px] w-full rounded shadow-lg z-[999]">
          <li>
            <Link to="/register" onClick={toggleClose} className="block w-full text-left hover:bg-red-500 px-3 py-2 rounded">
              Register
            </Link>
          </li>
          <li>
            <Link to="Service" onClick={toggleClose} className="block w-full text-left hover:bg-red-500 px-3 py-2 rounded">
              Services
            </Link>
          </li>
          <li>
            <Link to="membership" onClick={toggleClose} className="block w-full text-left hover:bg-red-500 px-3 py-2 rounded">
              Membership
            </Link>
          </li>
          <li>
            <Link to="FAQ" onClick={toggleClose} className="block w-full text-left hover:bg-red-500 px-3 py-2 rounded">
              FAQ
            </Link>
          </li>
          <li>
            <Link to="contact" onClick={toggleClose} className="block w-full text-left hover:bg-red-500 px-3 py-2 rounded">
              Contact
            </Link>
          </li>
        </ul>
      )}
    </>
  );
};
