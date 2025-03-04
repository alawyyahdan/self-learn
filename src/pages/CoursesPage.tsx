import React, { useState, useEffect } from 'react';
import { CourseCard } from '../components/CourseCard';
import { Course } from '../types';
import { GraduationCap, AlertCircle, LogIn, RefreshCw, Search, LogOut } from 'lucide-react';
import { supabase, fetchCourses } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { LoginModal } from '../components/LoginModal';
import { ThemeToggle } from '../components/ThemeToggle';

export function CoursesPage() {
  const [semester, setSemester] = useState<number | 'all'>('all');
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [availableSemesters, setAvailableSemesters] = useState<number[]>([1, 2, 3, 4]);
  const navigate = useNavigate();

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    
    checkAuth();
    
    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      setError(null);

      const coursesData = await fetchCourses();
      
      setCourses(coursesData);
      filterCourses(coursesData, semester, searchQuery);
      
      // Extract all unique semesters
      const semesters = [...new Set(coursesData.map(course => course.semester))];
      // Find the highest semester number
      const maxSemester = Math.max(...semesters, 4);
      // Create an array of all semesters from 1 to maxSemester
      const allSemesters = Array.from({ length: maxSemester }, (_, i) => i + 1);
      setAvailableSemesters(allSemesters);
    } catch (error) {
      console.error('Error loading courses:', error);
      setError('Failed to load courses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filter courses based on semester and search query
  const filterCourses = (coursesData: Course[], semesterFilter: number | 'all', query: string) => {
    let filtered = coursesData;
    
    // Filter by semester
    if (semesterFilter !== 'all') {
      filtered = filtered.filter(course => course.semester === semesterFilter);
    }
    
    // Filter by search query
    if (query.trim() !== '') {
      const searchLower = query.toLowerCase();
      filtered = filtered.filter(course => 
        course.title.toLowerCase().includes(searchLower) || 
        (course.description && course.description.toLowerCase().includes(searchLower))
      );
    }
    
    setFilteredCourses(filtered);
  };

  // Load courses when component mounts
  useEffect(() => {
    loadCourses();
  }, []);

  // Apply filters when semester or search query changes
  useEffect(() => {
    filterCourses(courses, semester, searchQuery);
  }, [semester, searchQuery, courses]);

  // Subscribe to realtime changes
  useEffect(() => {
    const subscription = supabase
      .channel('public:courses')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'courses' 
      }, () => {
        loadCourses();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []); 

  const handleSignOut = async () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      await supabase.auth.signOut();
      setIsAuthenticated(false);
    }
  };

  const handleAdminClick = () => {
    if (isAuthenticated) {
      navigate('/admin');
    } else {
      setIsLoginModalOpen(true);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200 relative pb-32">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <GraduationCap size={32} className="text-blue-600 dark:text-blue-400" />
              <h1 className="text-3xl font-bold">My Courses</h1>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <select
                value={semester === 'all' ? 'all' : semester.toString()}
                onChange={(e) => setSemester(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
              >
                <option value="all">All Semesters</option>
                {availableSemesters.map(sem => (
                  <option key={sem} value={sem}>Semester {sem}</option>
                ))}
              </select>
              {isAuthenticated ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate('/admin')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <LogIn size={18} />
                    <span className="hidden sm:inline">Admin Panel</span>
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <LogOut size={18} />
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAdminClick}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <LogIn size={20} />
                  <span className="hidden sm:inline">Staff Login</span>
                </button>
              )}
            </div>
          </div>

          <div className="mb-6">
            <div className="relative max-w-md mx-auto">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search size={18} className="text-gray-500 dark:text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search courses..."
                className="w-full pl-10 pr-4 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="text-red-600 dark:text-red-400" size={20} />
                <p className="text-red-600 dark:text-red-300 flex-1">{error}</p>
                <button
                  onClick={loadCourses}
                  className="flex items-center gap-2 px-3 py-1 text-red-600 dark:text-red-300 hover:text-red-700 dark:hover:text-red-200 border border-red-200 dark:border-red-700 rounded"
                >
                  <RefreshCw size={16} />
                  <span>Retry</span>
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
            </div>
          ) : filteredCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
              {filteredCourses.map(course => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 animate-fade-in">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 max-w-md mx-auto">
                <GraduationCap size={48} className="text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No Courses Found</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {searchQuery 
                    ? 'No courses match your search criteria.'
                    : semester === 'all' 
                      ? 'There are no courses available at the moment.'
                      : `No courses found for semester ${semester}.`}
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSemester('all');
                    loadCourses();
                  }}
                  className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                >
                  <RefreshCw size={16} />
                  <span>Reset Filters</span>
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Sticky image at the bottom */}
        <div className="fixed bottom-0 left-0 right-0 flex justify-center z-10">
          <a 
            href="https://sayato.lol" 
            target="_blank" 
            rel="noopener noreferrer"
            className="block"
          >
            <img 
              src="https://i.ibb.co/mCD441TQ/Whats-App-Image-2025-03-02-at-13-16-03-076ce3d5-removebg-preview.png" 
              alt="Sayato" 
              className="h-24 w-auto transition-transform cursor-pointer"
              style={{ touchAction: 'none' }}
            />
          </a>
        </div>
      </div>

      <LoginModal 
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </>
  );
}