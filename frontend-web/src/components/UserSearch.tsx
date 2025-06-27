import React, { useState, useEffect } from 'react';
import { XMarkIcon, MagnifyingGlassIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import type { User } from '@shared/types';
import apiService from '@/services/api';
import { useChatStore } from '@/store/chatStore';
import LoadingSpinner from '@/components/LoadingSpinner';
import toast from 'react-hot-toast';

interface UserSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserSearch: React.FC<UserSearchProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreatingConversation, setIsCreatingConversation] = useState<number | null>(null);
  
  const { createConversation, selectConversation } = useChatStore();

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        performSearch(searchQuery.trim());
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchQuery]);

  const performSearch = async (query: string) => {
    try {
      setIsSearching(true);
      const results = await apiService.searchUsers(query, 10);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleStartConversation = async (user: User) => {
    try {
      setIsCreatingConversation(user.id);
      
      const conversation = await createConversation(user.id);
      await selectConversation(conversation);
      
      toast.success(`Started conversation with ${user.username}`);
      onClose();
    } catch (error) {
      console.error('Failed to create conversation:', error);
      toast.error('Failed to start conversation');
    } finally {
      setIsCreatingConversation(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-96 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Find Users</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input pl-10"
              placeholder="Search by username or email..."
              autoFocus
            />
            {isSearching && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <LoadingSpinner size="sm" />
              </div>
            )}
          </div>
        </div>

        {/* Search Results */}
        <div className="flex-1 overflow-y-auto">
          {searchQuery.trim().length < 2 ? (
            <div className="p-4 text-center text-gray-500">
              <MagnifyingGlassIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>Type at least 2 characters to search</p>
            </div>
          ) : searchResults.length === 0 && !isSearching ? (
            <div className="p-4 text-center text-gray-500">
              <UserPlusIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>No users found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {user.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.username}</p>
                        <p className="text-sm text-gray-500 truncate">{user.email}</p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleStartConversation(user)}
                      disabled={isCreatingConversation === user.id}
                      className="btn-primary py-2 px-4 text-sm flex items-center"
                    >
                      {isCreatingConversation === user.id ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Starting...
                        </>
                      ) : (
                        <>
                          <UserPlusIcon className="w-4 h-4 mr-2" />
                          Chat
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserSearch;
