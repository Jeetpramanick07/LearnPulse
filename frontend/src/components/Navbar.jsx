import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const navLinks = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Manage Students', path: '/students-management' },
    { label: 'Marks', path: '/marks-management' },
    { label: 'Analytics', path: '/analytics' },
  ];

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <img src="/Logo2.png" alt="LearnPulse" className="w-8 h-8" />
            <h1 className="text-lg font-semibold text-gray-900">
              LearnPulse
            </h1>
          </div>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={`text-sm font-medium transition ${
                  location.pathname === link.path
                    ? 'text-purple-600'
                    : 'text-gray-600 hover:text-purple-600'
                }`}
              >
                {link.label}
              </button>
            ))}

            <span className="text-sm text-gray-600">
              {currentUser?.displayName || currentUser?.email || 'Faculty'}
            </span>

            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition"
            >
              Logout
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-gray-700"
            onClick={() => setIsOpen(!isOpen)}
          >
            ☰
          </button>
        </div>

        {/* Mobile Dropdown */}
        {isOpen && (
          <div className="md:hidden flex flex-col gap-4 pb-4">
            {navLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => {
                  navigate(link.path);
                  setIsOpen(false);
                }}
                className="text-left text-sm font-medium text-gray-600 hover:text-purple-600"
              >
                {link.label}
              </button>
            ))}

            <span className="text-sm text-gray-600">
              {currentUser?.displayName || currentUser?.email || 'Faculty'}
            </span>

            <button
              onClick={handleLogout}
              className="text-left text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}