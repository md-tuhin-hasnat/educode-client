import { create } from 'zustand';

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
  token: string;
  refreshToken?: string;
  departmentId?: string;
}

interface AuthState {
  user: UserSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: UserSession) => void;
  logout: () => void;
  initSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: (user) => {
    set({ user, isAuthenticated: true, isLoading: false });
    if (typeof window !== 'undefined') {
      if (window.educode) {
        window.educode.auth.saveSession(user);
      } else {
        localStorage.setItem('educode_session', JSON.stringify(user));
      }
    }
  },

  logout: () => {
    set({ user: null, isAuthenticated: false, isLoading: false });
    if (typeof window !== 'undefined') {
      if (window.educode) {
        window.educode.auth.clearSession();
      } else {
        localStorage.removeItem('educode_session');
      }
    }
  },

  initSession: async () => {
    if (typeof window !== 'undefined') {
      if (window.educode) {
        try {
          const session = (await window.educode.auth.getSession()) as UserSession | null;
          if (session && session.token) {
            set({ user: session, isAuthenticated: true, isLoading: false });
            return;
          }
        } catch (err) {
          console.error('[AuthStore] Error loading desktop session:', err);
        }
      } else {
        try {
          const saved = localStorage.getItem('educode_session');
          if (saved) {
            const session = JSON.parse(saved) as UserSession;
            if (session && session.token) {
              set({ user: session, isAuthenticated: true, isLoading: false });
              return;
            }
          }
        } catch (err) {
          console.error('[AuthStore] Error loading local session:', err);
        }
      }
    }
    set({ isLoading: false });
  },
}));
