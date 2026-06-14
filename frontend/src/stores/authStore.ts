import { create } from 'zustand';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'agent';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;

  login: (token: string, user: User) => void;
  logout: () => void;
  setUser: (user: User) => void;
}

/**
 * Auth Store — Zustand com persistência em localStorage.
 * Gerencia user, token, login() e logout().
 */
export const useAuthStore = create<AuthState>((set) => {
  // Hidrata do localStorage no startup
  const storedToken = localStorage.getItem('megacrm_token');
  const storedUser = localStorage.getItem('megacrm_user');

  return {
    user: storedUser ? JSON.parse(storedUser) : null,
    token: storedToken,
    isAuthenticated: !!storedToken,

    login: (token: string, user: User) => {
      localStorage.setItem('megacrm_token', token);
      localStorage.setItem('megacrm_user', JSON.stringify(user));
      set({ token, user, isAuthenticated: true });
    },

    logout: () => {
      localStorage.removeItem('megacrm_token');
      localStorage.removeItem('megacrm_user');
      set({ token: null, user: null, isAuthenticated: false });
    },

    setUser: (user: User) => {
      localStorage.setItem('megacrm_user', JSON.stringify(user));
      set({ user });
    },
  };
});
