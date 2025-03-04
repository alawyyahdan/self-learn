import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface VideoPlayerProps {
  videoUrl: string;
  title: string;
}

export function VideoPlayer({ videoUrl, title }: VideoPlayerProps) {
  const { theme } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      // Try to parse the video URL or embed code
      if (videoUrl.includes('<iframe')) {
        // If it's already an iframe, use it directly
        if (containerRef.current) {
          containerRef.current.innerHTML = videoUrl;
        }
      } else {
        // Create a new iframe for direct video URLs
        const iframe = document.createElement('iframe');
        iframe.src = videoUrl;
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        iframe.allowFullScreen = true;
        iframe.style.position = 'absolute';
        iframe.style.top = '0';
        iframe.style.left = '0';
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
          containerRef.current.appendChild(iframe);
        }
      }
    } catch (err) {
      console.error('Error embedding video:', err);
      setError('Failed to load video. Please try again later.');
    }
  }, [videoUrl]);

  return (
    <div className="space-y-4">
      <div className="w-full relative bg-black rounded-lg overflow-hidden" style={{ paddingTop: '56.25%' }}>
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center p-4">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
              <p className="text-white">{error}</p>
            </div>
          </div>
        ) : (
          <div 
            ref={containerRef}
            className="absolute top-0 left-0 w-full h-full"
          />
        )}
      </div>
      {title && (
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
      )}
    </div>
  );
}