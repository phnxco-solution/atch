import React, { useState } from 'react';
import { 
  Cog6ToothIcon, 
  ArrowRightOnRectangleIcon,
  MagnifyingGlassIcon 
} from '@heroicons/react/24/outline';
import type { User } from '@shared/types';
import { useAuth } from '@/hooks/useAuth';
import UserSearch from '@/components/UserSearch';

interface UserHeaderProps {
  user: User;
}

const UserHeader: React.FC<UserHeaderProps> = ({ user }) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-sm">
              {user.username.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">{user.username}</h2>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Search users"
          >
            <MagnifyingGlassIcon className="w-5 h-5 text-gray-600" />
          </button>

          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Settings"
            >
              <Cog6ToothIcon className="w-5 h-5 text-gray-600" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="py-1">
                  <div className="px-4 py-2 text-sm text-gray-500 border-b border-gray-100">
                    <div className="font-medium">{user.username}</div>
                    <div className="truncate">{user.email}</div>
                  </div>
                  
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center"
                  >
                    <ArrowRightOnRectangleIcon className="w-4 h-4 mr-2" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Search Modal */}
      {isSearchOpen && (
        <UserSearch 
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
        />
      )}

      {/* Click outside to close menu */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </div>
  );
};

export default UserHeader;
