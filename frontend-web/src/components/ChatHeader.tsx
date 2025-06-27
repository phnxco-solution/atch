import React from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import type { Conversation } from '@shared/types';
import EncryptionService from '@/utils/encryption';

interface ChatHeaderProps {
  conversation: Conversation;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ conversation }) => {
  const { otherUser } = conversation;

  const getKeyFingerprint = () => {
    try {
      return EncryptionService.generateKeyFingerprint(otherUser.publicKey);
    } catch (error) {
      return 'Invalid key';
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Avatar */}
          <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-sm">
              {otherUser.username.charAt(0).toUpperCase()}
            </span>
          </div>

          {/* User Info */}
          <div>
            <h2 className="font-semibold text-gray-900">
              {otherUser.username}
            </h2>
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <span className="flex items-center">
                🔒 End-to-end encrypted
              </span>
              <span>•</span>
              <span title={`Key fingerprint: ${getKeyFingerprint()}`}>
                Key: {getKeyFingerprint()}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          <button
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Conversation info"
          >
            <InformationCircleIcon className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;
