'use client';

import { useEffect, useState } from 'react';

interface SigningAnimationProps {
  isVisible: boolean;
  message?: string;
}

export default function SigningAnimation({ isVisible, message = "Signing contract..." }: SigningAnimationProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isVisible) {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 2;
        });
      }, 50);

      return () => clearInterval(interval);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-[#00FA9A] shadow-2xl z-50 animate-slide-up">
      <div className="max-w-md mx-auto p-6">
        <div className="flex items-center space-x-4">
          {/* Animated Pen Icon */}
          <div className="relative">
            <svg 
              className="w-8 h-8 text-[#00FA9A] animate-bounce" 
              fill="currentColor" 
              viewBox="0 0 24 24"
            >
              <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z" />
            </svg>
            {/* Signature line animation */}
            <div className="absolute -bottom-2 -right-2">
              <div 
                className="h-0.5 bg-[#00FA9A] transition-all duration-1000 ease-out"
                style={{ width: `${progress * 0.3}px` }}
              />
            </div>
          </div>

          <div className="flex-1">
            <p className="text-black font-medium">{message}</p>
            <div className="mt-2 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-[#00FA9A] h-2 rounded-full transition-all duration-100 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Please confirm in your wallet</p>
          </div>

          {/* Animated signature */}
          <div className="text-right">
            <div className="text-xs text-gray-500">Digital Signature</div>
            <div className="font-mono text-xs text-[#00FA9A] animate-pulse">
              {progress > 50 && "✓ Authenticated"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 