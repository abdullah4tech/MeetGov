/**
 * API Client
 * 
 * Centralized API client for making requests to the backend
 */

import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Intercept requests to add auth token if available
api.interceptors.request.use((config: any) => {
  // Only add token if we're in a browser environment
  if (typeof window !== 'undefined') {
    const token = sessionStorage.getItem('guest_session_token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  
  return config;
});

// Helper for handling API responses in a consistent way
export const handleApiResponse = async <T>(promise: Promise<T>): Promise<{ data: T | null; error: Error | null }> => {
  try {
    const data = await promise;
    return { data, error: null };
  } catch (error: any) {
    console.error('API Error:', error);
    // Extract error message from axios response if available
    const message = error?.response?.data?.error 
      || error?.response?.data?.message 
      || error?.message 
      || 'Unknown error';
    return { data: null, error: new Error(message) };
  }
};
