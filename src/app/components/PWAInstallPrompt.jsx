"use client";
import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { X, Download, Smartphone } from 'lucide-react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Set client-side flag
    setIsClient(true);
    
    // Check if app is already installed
    const checkIfInstalled = () => {
      // Check for standalone mode (Android/Desktop)
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
        return true;
      }
      
      // Check for iOS standalone mode
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator.standalone);
      
      if (isIOS && isInStandaloneMode) {
        console.log('App is already installed (iOS standalone mode)');
        setIsInstalled(true);
        return true;
      }
      
      // Check if previously installed (stored in localStorage)
      const wasInstalled = localStorage.getItem('pwa-installed') === 'true';
      if (wasInstalled) {
        setIsInstalled(true);
        return true;
      }
      
      return false;
    };

    checkIfInstalled();

    // Listen for the beforeinstallprompt event (Android/Desktop)
    const handleBeforeInstallPrompt = (e) => {
      
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show our custom install prompt after a delay
      setTimeout(() => {
        setShowInstallPrompt(true);
      }, 2000);
    };

    // For iOS Safari - show prompt after delay (no beforeinstallprompt event)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    
    // Development mode override - show prompt for testing
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Wait for service worker to be ready before showing prompt
    const waitForServiceWorker = () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(() => {          
          // Double-check if app is installed before showing prompt
          const isCurrentlyInstalled = checkIfInstalled();
          
          // Check if we should show the prompt
          if (!isCurrentlyInstalled && ((isIOS && isSafari) || isDevelopment)) {
            const delay = isDevelopment ? 3000 : 5000; // Wait longer for service worker
            setTimeout(() => {
              setShowInstallPrompt(true);
            }, delay);
          } else if (isCurrentlyInstalled) {
            console.log('App is already installed, not showing prompt');
          }
        });
      } else {
        // Fallback if no service worker support
        const isCurrentlyInstalled = checkIfInstalled();
        if (!isCurrentlyInstalled && ((isIOS && isSafari) || isDevelopment)) {
          setTimeout(() => {
            setShowInstallPrompt(true);
          }, 3000);
        }
      }
    };
    
    // Wait a bit for service worker to register
    setTimeout(waitForServiceWorker, 1000);

    // Listen for the appinstalled event
    const handleAppInstalled = () => {
      console.log('PWA was installed');
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
      // Mark as installed in localStorage so it won't show again
      localStorage.setItem('pwa-installed', 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    
    // Enhanced browser and platform detection
    const isChrome = /Chrome/.test(navigator.userAgent) && !/Edg/.test(navigator.userAgent);
    const isEdge = /Edg/.test(navigator.userAgent);
    const isFirefox = /Firefox/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    const isOpera = /Opera|OPR/.test(navigator.userAgent);
    const isSamsungBrowser = /SamsungBrowser/.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    const isDesktop = !isIOS && !isAndroid;
    
    if (!deferredPrompt) {
      // Show detailed installation guide based on platform and browser
      let installGuide = '';
      
      if (isIOS) {
        if (isSafari) {
          installGuide = `📱 Install Suplient on iOS Safari:

1. Tap the Share button (📤) at the bottom of Safari
2. Scroll down and tap "Add to Home Screen"
3. Tap "Add" to confirm

The app will appear on your home screen like a native app!`;
        } else {
          installGuide = `📱 Install Suplient on iOS (${isChrome ? 'Chrome' : isFirefox ? 'Firefox' : 'Other Browser'}):

1. Tap the Share button (📤) at the bottom
2. Scroll down and tap "Add to Home Screen"
3. Tap "Add" to confirm

Note: iOS 16.4+ supports PWA installation from Chrome, Edge, Firefox, and other browsers.`;
        }
      } else if (isAndroid) {
        if (isChrome) {
          installGuide = `🤖 Install Suplient on Android Chrome:

Method 1 - Install Prompt:
• Look for "Add to Home Screen" banner at bottom
• Tap "Add" if it appears

Method 2 - Manual Install:
1. Tap the three dots menu (⋮) in Chrome
2. Select "Add to Home Screen" or "Install app"
3. Tap "Add" to confirm

The app will work offline and feel like a native app!`;
        } else if (isFirefox) {
          installGuide = `🤖 Install Suplient on Android Firefox:

1. Tap the three dots menu (⋮) in Firefox
2. Select "Add to Home Screen"
3. Tap "Add" to confirm

The app will appear on your home screen!`;
        } else if (isSamsungBrowser) {
          installGuide = `🤖 Install Suplient on Samsung Internet:

1. Tap the menu button (⋮) in Samsung Internet
2. Select "Add page to" → "Home screen"
3. Tap "Add" to confirm

The app will work offline and sync with your Samsung account!`;
        } else {
          installGuide = `🤖 Install Suplient on Android:

1. Tap the three dots menu (⋮) in your browser
2. Look for "Add to Home Screen" or "Install app"
3. Tap "Add" to confirm

The app will appear on your home screen!`;
        }
      } else if (isDesktop) {
        if (isChrome) {
          installGuide = `💻 Install Suplient on Desktop Chrome:

Method 1 - Install Button:
• Look for the install icon (⬇️) in the address bar
• Click it and select "Install"

Method 2 - Menu Install:
1. Click the three dots menu (⋮) in Chrome
2. Select "Install Suplient..."
3. Click "Install" in the dialog

The app will open in its own window like a desktop app!`;
        } else if (isEdge) {
          installGuide = `💻 Install Suplient on Desktop Edge:

Method 1 - App Available Icon:
• Look for "App available" icon in address bar
• Click it and select "Install"

Method 2 - Menu Install:
1. Click the three dots menu (⋮) in Edge
2. Select "Apps" → "Install Suplient"
3. Click "Install" to confirm

The app will appear in your Start menu and taskbar!`;
        } else if (isSafari) {
          installGuide = `💻 Install Suplient on Desktop Safari (macOS 17+):

1. Go to "File" in the menu bar
2. Select "Add to Dock"
3. The app will appear in your Dock

Note: Requires Safari 17+ on macOS. The app will work offline!`;
        } else if (isFirefox) {
          installGuide = `💻 Install Suplient on Desktop Firefox:

Unfortunately, Firefox on desktop doesn't support PWA installation yet.

Alternative options:
• Use Chrome or Edge for full PWA support
• Bookmark this page for quick access
• Use Firefox Mobile for PWA installation

We're working on Firefox compatibility!`;
        } else if (isOpera) {
          installGuide = `💻 Install Suplient on Desktop Opera:

1. Click the Opera menu button (☰)
2. Select "Install Suplient..."
3. Click "Install" to confirm

The app will open in its own window!`;
        } else {
          installGuide = `💻 Install Suplient on Desktop:

1. Look for an install icon in your browser's address bar
2. Click it and follow the installation prompts

Or:
1. Use your browser's menu to find "Install" or "Add to Home Screen"
2. Follow the browser's installation process

The app will work offline and feel like a native desktop app!`;
        }
      } else {
        installGuide = `📱 Install Suplient:

1. Use your browser's menu (⋮) to find "Add to Home Screen" or "Install"
2. Follow your browser's installation process
3. The app will work offline and feel like a native app!

For the best experience, use Chrome, Edge, Safari, or Firefox.`;
      }
      
      alert(installGuide);
      setShowInstallPrompt(false);
      return;
    }

    try {
      // Show the install prompt
      deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
            
      // Clear the deferredPrompt
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
      
      if (outcome === 'accepted') {
        // Mark as installed in localStorage so it won't show again
        localStorage.setItem('pwa-installed', 'true');
      } else {
        console.log('User dismissed the install prompt');
      }
    } catch (error) {
      console.error('Error showing install prompt:', error);
      // Fallback message
      alert('Installation failed. Please try using your browser\'s menu to install the app.');
      setShowInstallPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    setDeferredPrompt(null);
    // Don't show again for this session
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  };

  // Don't render until client-side
  if (!isClient) {
    return null;
  }

  // Check if dismissed in this session (client-side only)
  const isDismissed = sessionStorage.getItem('pwa-install-dismissed') === 'true';
  
  // Don't show if already installed or dismissed in this session
  if (isInstalled || !showInstallPrompt || isDismissed) {
    // Show debug info in development
    if (process.env.NODE_ENV === 'development') {
      console.log('PWA Install Prompt not showing:', {
        isInstalled,
        showInstallPrompt,
        isDismissed,
        isClient
      });
    }
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm mx-auto">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Smartphone className="h-5 w-5 text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-900">
                Install Suplient App
              </h3>
            </div>
            <p className="text-xs text-gray-600 mb-3">
              Add to your home screen for quick access and offline use.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={handleInstallClick}
                size="sm"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Download className="h-4 w-4" />
                Install
              </Button>
              <Button
                onClick={handleDismiss}
                variant="outline"
                size="sm"
                className="text-gray-600"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
  );
} 