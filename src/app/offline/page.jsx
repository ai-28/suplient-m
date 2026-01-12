"use client"
import React from 'react';

export default function OfflinePage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
                <div className="mb-4">
                    <svg 
                        className="mx-auto h-12 w-12 text-gray-400" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                    >
                        <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 100 19.5 9.75 9.75 0 000-19.5z" 
                        />
                    </svg>
                </div>
                
                <h1 className="text-xl font-semibold text-gray-900 mb-2">
                    You're Offline
                </h1>
                
                <p className="text-gray-600 mb-4">
                    It looks like you're not connected to the internet. 
                    Please check your connection and try again.
                </p>
                
                <button 
                    onClick={() => window.location.reload()} 
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                    Try Again
                </button>
                
                <div className="mt-4 text-sm text-gray-500">
                    <p>Some features may not be available offline.</p>
                </div>
            </div>
        </div>
    );
}
