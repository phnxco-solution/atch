import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import socketService from '@/services/socket';

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const { token, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && token && !socketService.isConnected()) {
      socketService.connect(token)
        .then(() => setIsConnected(true))
        .catch(console.error);
    }

    const checkConnection = () => {
      setIsConnected(socketService.isConnected());
    };

    const interval = setInterval(checkConnection, 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated, token]);

  return {
    isConnected,
    socket: socketService
  };
};
