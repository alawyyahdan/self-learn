import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CoursesPage } from './pages/CoursesPage';
import { LecturePage } from './pages/LecturePage';
import { AdminPage } from './pages/AdminPage';
import { CourseLecturesPage } from './pages/CourseLecturesPage';
import { supabase } from './lib/supabase';
import { ThemeProvider } from './context/ThemeContext';

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check initial auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      setIsInitialized(true);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<CoursesPage />} />
          <Route path="/course/:courseId" element={<CourseLecturesPage />} />
          <Route path="/course/:courseId/lecture/:lectureId" element={<LecturePage />} />
          <Route 
            path="/admin" 
            element={isAuthenticated ? <AdminPage /> : <Navigate to="/" replace />} 
          />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;