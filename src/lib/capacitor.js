import { Capacitor } from '@capacitor/core';

/**
 * Check if the app is running on a native platform (iOS/Android)
 * @returns {boolean}
 */
export const isNative = () => {
  return Capacitor.isNativePlatform();
};

/**
 * Get the current platform (ios, android, web)
 * @returns {string}
 */
export const getPlatform = () => {
  return Capacitor.getPlatform();
};

/**
 * Check if running on iOS
 * @returns {boolean}
 */
export const isIOS = () => {
  return getPlatform() === 'ios';
};

/**
 * Check if running on Android
 * @returns {boolean}
 */
export const isAndroid = () => {
  return getPlatform() === 'android';
};

/**
 * Check if running on web
 * @returns {boolean}
 */
export const isWeb = () => {
  return getPlatform() === 'web';
};

/**
 * Get the native platform name (iOS/Android) or null if web
 * @returns {string|null}
 */
export const getNativePlatform = () => {
  const platform = getPlatform();
  return platform !== 'web' ? platform : null;
};

