"use client";

import { useEffect } from 'react';

export function useServiceWorker() {
    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            // Register service worker manually
            navigator.serviceWorker.register('/sw.js')
                .then((registration) => {

                    // Check for updates
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        if (newWorker) {
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    console.log('New content available, please refresh');
                                    // You can show a toast notification here
                                }
                            });
                        }
                    });
                })
                .catch((error) => {
                    console.log('Service Worker registration failed:', error);
                });

            // Listen for service worker messages
            navigator.serviceWorker.addEventListener('message', (event) => {
                console.log('Message from service worker:', event.data);
            });
        }
    }, []);
}
