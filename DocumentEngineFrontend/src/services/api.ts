import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/auth';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT access token to every outgoing HTTP request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export interface LoginPayload {
  username: string;
  password: string;
}

export interface RegisterPayload {
  username: string;
  email?: string;
  first_name?: string;
  password: string;
}

export interface TokenResponse {
  access: string;
  refresh: string;
}

export const authService = {
  login: async (credentials: LoginPayload): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>('/login/', credentials);
    if (response.data.access) {
      localStorage.setItem('access_token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);
    }
    return response.data;
  },

  register: async (data: RegisterPayload) => {
    const response = await api.post('/register/', data);
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },
};

export interface DocumentData {
  id: string;
  title: string;
  content_json: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface UserPresence {
  type: 'user_presence';
  event: 'JOIN' | 'LEAVE';
  user_id: string;
  username: string;
}

export interface DocUpdateMessage {
  type: 'doc_update';
  content: any;
}

export type WSMessage = UserPresence | DocUpdateMessage;