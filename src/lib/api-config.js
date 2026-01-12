import { Capacitor } from '@capacitor/core';

/**
 * Get the base API URL for the current environment
 * In native apps, this will use the server URL from Capacitor config
 * In web, this will use the current origin or a configured API URL
 */
export const getApiUrl = () => {
  // Check if we're in a native app
  if (Capacitor.isNativePlatform()) {
    // In native apps, Capacitor will handle the server URL
    // API calls should be relative to the configured server.url
    return '';
  }
  
  // For web, use the current origin or a configured API URL
  if (typeof window !== 'undefined') {
    // Use the current origin in browser
    return window.location.origin;
  }
  
  // Fallback for SSR
  return process.env.NEXT_PUBLIC_API_URL || '';
};

/**
 * Make an API request with proper error handling
 * This ensures API calls work in both web and native environments
 */
export const apiRequest = async (endpoint, options = {}) => {
  const baseUrl = getApiUrl();
  const url = baseUrl ? `${baseUrl}${endpoint}` : endpoint;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
};

/**
 * Check if the app is running in a native environment
 * Useful for conditionally enabling/disabling features
 */
export const isNativeApp = () => {
  return Capacitor.isNativePlatform();
};

