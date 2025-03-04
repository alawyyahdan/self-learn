/// <reference types="vite/client" />

interface Window {
  YT: any;
  onYouTubeIframeAPIReady: () => void;
  __preloadedData?: {
    courses?: any[];
    [key: string]: any;
  };
}