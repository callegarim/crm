import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore, type User } from '@/stores/authStore';
import { useSocketStore } from '@/stores/socketStore';

interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginResponse {
  token: string;
  user: User;
}

/**
 * Hook de autenticação — login, logout, e dados do usuário
 */
export function useAuth() {
  const navigate = useNavigate();
  const { user, token, isAuthenticated, login, logout: storeLogout } = useAuthStore();
  const { connect, disconnect } = useSocketStore();

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials): Promise<LoginResponse> => {
      const { data } = await api.post('/auth/login', credentials);
      return data;
    },
    onSuccess: (data) => {
      login(data.token, data.user);
      connect();
      navigate('/dashboard');
    },
  });

  const logout = () => {
    disconnect();
    storeLogout();
    navigate('/login');
  };

  return {
    user,
    token,
    isAuthenticated,
    isAdmin: user?.role === 'admin',
    login: loginMutation.mutate,
    loginError: loginMutation.error,
    isLoggingIn: loginMutation.isPending,
    logout,
  };
}
