import { create } from 'zustand';

interface AuthState {
  token: string | null;
  role: string | null;
  email: string | null;
  userId: number | null;
  isAuthenticated: boolean;
  login: (token: string, role: string, email: string, userId: number) => void;
  logout: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  role: null,
  email: null,
  userId: null,
  isAuthenticated: false,
  
  login: (token, role, email, userId) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_role', role);
    localStorage.setItem('auth_email', email);
    localStorage.setItem('auth_userId', String(userId));
    set({ token, role, email, userId, isAuthenticated: true });
  },
  
  logout: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_role');
    localStorage.removeItem('auth_email');
    localStorage.removeItem('auth_userId');
    set({ token: null, role: null, email: null, userId: null, isAuthenticated: false });
  },
  
  initialize: () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      const role = localStorage.getItem('auth_role');
      const email = localStorage.getItem('auth_email');
      const userIdStr = localStorage.getItem('auth_userId');
      
      if (token && role && email && userIdStr) {
        set({
          token,
          role,
          email,
          userId: Number(userIdStr),
          isAuthenticated: true
        });
      }
    }
  }
}));
