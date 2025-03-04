import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Course, Section, Lecture, Module } from '../types';
import { 
  Plus, 
  Edit, 
  Trash, 
  Save, 
  X, 
  ChevronDown, 
  ChevronRight, 
  ArrowLeft, 
  Upload,
  FileText,
  Video,
  Book,
  Layers,
  LogOut,
  AlertCircle
} from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';
import { ModuleUploader } from '../components/ModuleUploader';

export function AdminPage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'courses' | 'sections' | 'lectures' | 'modules'>('courses');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  // Edit states
  const [editingCourse, setEditingCourse] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editingLecture, setEditingLecture] = useState<string | null>(null);
  const [editCourseData, setEditCourseData] = useState<Partial<Course>>({});
  const [editSectionData, setEditSectionData] = useState<Partial<Section>>({});
  const [editLectureData, setEditLectureData] = useState<Partial<Lecture>>({});
  
  // New item states
  const [isAddingCourse, setIsAddingCourse] = useState(false);
  const [isAddingSection, setIsAddingSection] = useState<string | null>(null); // courseId
  const [isAddingLecture, setIsAddingLecture] = useState<{courseId: string, sectionId?: string} | null>(null);
  const [newCourseData, setNewCourseData] = useState<Partial<Course>>({
    title: '',
    description: '',
    semester: 1,
    thumbnail: ''
  });
  const [newSectionData, setNewSectionData] = useState<Partial<Section>>({
    title: '',
    description: '',
    order: 0
  });
  const [newLectureData, setNewLectureData] = useState<Partial<Lecture>>({
    title: '',
    videoUrl: '',
    content: '',
    transcript: '',
    order: 0
  });
  
  // Module upload state
  const [uploadingModuleForLecture, setUploadingModuleForLecture] = useState<string | null>(null);
  
  // Refs for scrolling
  const coursesRef = useRef<HTMLDivElement>(null);
  const sectionsRef = useRef<HTMLDivElement>(null);
  const lecturesRef = useRef<HTMLDivElement>(null);
  
  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
        if (session?.user) {
          setUser(session.user);
        } else {
          navigate('/');
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
    
    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      if (!session) {
        navigate('/');
      }
    });
    
    return () => subscription.unsubscribe();
  }, [navigate]);
  
  // Load courses data
  const loadCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          sections (
            *,
            lectures (*)
          ),
          lectures (*)
        `)
        .order('semester');
      
      if (error) throw error;
      
      // Sort sections and lectures
      const sortedCourses = data?.map(course => ({
        ...course,
        sections: course.sections?.sort((a, b) => a.order - b.order) || [],
        lectures: course.lectures?.sort((a, b) => a.order - b.order) || []
      })) || [];
      
      setCourses(sortedCourses);
    } catch (err) {
      console.error('Error loading courses:', err);
      setError('Failed to load courses. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (isAuthenticated) {
      loadCourses();
    }
  }, [isAuthenticated]);
  
  // Toggle expanded state for courses and sections
  const toggleCourseExpanded = (courseId: string) => {
    setExpandedCourses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(courseId)) {
        newSet.delete(courseId);
      } else {
        newSet.add(courseId);
      }
      return newSet;
    });
  };
  
  const toggleSectionExpanded = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };
  
  // Handle sign out
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  // CRUD operations for courses
  const handleAddCourse = async () => {
    try {
      if (!newCourseData.title) {
        setError('Course title is required');
        return;
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be logged in to add a course');
        return;
      }
      
      const { data, error } = await supabase
        .from('courses')
        .insert({
          title: newCourseData.title,
          description: newCourseData.description || '',
          semester: newCourseData.semester || 1,
          thumbnail: newCourseData.thumbnail || 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80',
          user_id: user.id
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setCourses(prev => [...prev, { ...data, sections: [], lectures: [] }]);
      setIsAddingCourse(false);
      setNewCourseData({
        title: '',
        description: '',
        semester: 1,
        thumbnail: ''
      });
      
      // Expand the newly added course
      setExpandedCourses(prev => new Set([...prev, data.id]));
      
      // Scroll to the new course
      setTimeout(() => {
        const courseElements = document.querySelectorAll('[data-course-id]');
        const lastCourse = courseElements[courseElements.length - 1];
        lastCourse?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } catch (err) {
      console.error('Error adding course:', err);
      setError('Failed to add course. Please try again.');
    }
  };
  
  const handleUpdateCourse = async (courseId: string) => {
    try {
      if (!editCourseData.title) {
        setError('Course title is required');
        return;
      }
      
      const { data, error } = await supabase
        .from('courses')
        .update({
          title: editCourseData.title,
          description: editCourseData.description,
          semester: editCourseData.semester,
          thumbnail: editCourseData.thumbnail
        })
        .eq('id', courseId)
        .select()
        .single();
      
      if (error) throw error;
      
      setCourses(prev => prev.map(course => 
        course.id === courseId ? { ...course, ...data } : course
      ));
      
      setEditingCourse(null);
      setEditCourseData({});
    } catch (err) {
      console.error('Error updating course:', err);
      setError('Failed to update course. Please try again.');
    }
  };
  
  const handleDeleteCourse = async (courseId: string) => {
    if (!window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);
      
      if (error) throw error;
      
      setCourses(prev => prev.filter(course => course.id !== courseId));
      
      // Remove from expanded courses
      setExpandedCourses(prev => {
        const newSet = new Set(prev);
        newSet.delete(courseId);
        return newSet;
      });
    } catch (err) {
      console.error('Error deleting course:', err);
      setError('Failed to delete course. Please try again.');
    }
  };
  
  // CRUD operations for sections
  const handleAddSection = async (courseId: string) => {
    try {
      if (!newSectionData.title) {
        setError('Section title is required');
        return;
      }
      
      // Get the highest order value for sections in this course
      const course = courses.find(c => c.id === courseId);
      const maxOrder = course?.sections?.reduce((max, section) => 
        Math.max(max, section.order), 0) || 0;
      
      const { data, error } = await supabase
        .from('sections')
        .insert({
          title: newSectionData.title,
          description: newSectionData.description || '',
          order: maxOrder + 1,
          course_id: courseId
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setCourses(prev => prev.map(course => {
        if (course.id === courseId) {
          return {
            ...course,
            sections: [...(course.sections || []), { ...data, lectures: [] }]
          };
        }
        return course;
      }));
      
      setIsAddingSection(null);
      setNewSectionData({
        title: '',
        description: '',
        order: 0
      });
      
      // Expand the newly added section
      setExpandedSections(prev => new Set([...prev, data.id]));
      
      // Scroll to the new section
      setTimeout(() => {
        const sectionElements = document.querySelectorAll(`[data-course-id="${courseId}"] [data-section-id]`);
        const lastSection = sectionElements[sectionElements.length - 1];
        lastSection?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } catch (err) {
      console.error('Error adding section:', err);
      setError('Failed to add section. Please try again.');
    }
  };
  
  const handleUpdateSection = async (sectionId: string) => {
    try {
      if (!editSectionData.title) {
        setError('Section title is required');
        return;
      }
      
      const { data, error } = await supabase
        .from('sections')
        .update({
          title: editSectionData.title,
          description: editSectionData.description
        })
        .eq('id', sectionId)
        .select()
        .single();
      
      if (error) throw error;
      
      setCourses(prev => prev.map(course => {
        if (course.sections?.some(section => section.id === sectionId)) {
          return {
            ...course,
            sections: course.sections.map(section => 
              section.id === sectionId ? { ...section, ...data } : section
            )
          };
        }
        return course;
      }));
      
      setEditingSection(null);
      setEditSectionData({});
    } catch (err) {
      console.error('Error updating section:', err);
      setError('Failed to update section. Please try again.');
    }
  };
  
  const handleDeleteSection = async (sectionId: string) => {
    if (!window.confirm('Are you sure you want to delete this section? This action cannot be undone.')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('sections')
        .delete()
        .eq('id', sectionId);
      
      if (error) throw error;
      
      setCourses(prev => prev.map(course => {
        if (course.sections?.some(section => section.id === sectionId)) {
          return {
            ...course,
            sections: course.sections.filter(section => section.id !== sectionId)
          };
        }
        return course;
      }));
      
      // Remove from expanded sections
      setExpandedSections(prev => {
        const newSet = new Set(prev);
        newSet.delete(sectionId);
        return newSet;
      });
    } catch (err) {
      console.error('Error deleting section:', err);
      setError('Failed to delete section. Please try again.');
    }
  };
  
  // CRUD operations for lectures
  const handleAddLecture = async () => {
    try {
      if (!isAddingLecture) return;
      if (!newLectureData.title) {
        setError('Lecture title is required');
        return;
      }
      
      const { courseId, sectionId } = isAddingLecture;
      
      // Get the highest order value for lectures in this course/section
      const course = courses.find(c => c.id === courseId);
      let maxOrder = 0;
      
      if (sectionId) {
        const section = course?.sections?.find(s => s.id === sectionId);
        maxOrder = section?.lectures?.reduce((max, lecture) => 
          Math.max(max, lecture.order), 0) || 0;
      } else {
        maxOrder = course?.lectures?.reduce((max, lecture) => 
          Math.max(max, lecture.order), 0) || 0;
      }
      
      const { data, error } = await supabase
        .from('lectures')
        .insert({
          title: newLectureData.title,
          videoUrl: newLectureData.videoUrl || '',
          content: newLectureData.content || '',
          transcript: newLectureData.transcript || '',
          order: maxOrder + 1,
          section_id: sectionId || null,
          course_id: courseId
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setCourses(prev => prev.map(course => {
        if (course.id === courseId) {
          if (sectionId) {
            return {
              ...course,
              sections: course.sections?.map(section => {
                if (section.id === sectionId) {
                  return {
                    ...section,
                    lectures: [...(section.lectures || []), data]
                  };
                }
                return section;
              }) || []
            };
          } else {
            return {
              ...course,
              lectures: [...(course.lectures || []), data]
            };
          }
        }
        return course;
      }));
      
      setIsAddingLecture(null);
      setNewLectureData({
        title: '',
        videoUrl: '',
        content: '',
        transcript: '',
        order: 0
      });
      
      // Scroll to the new lecture
      setTimeout(() => {
        const lectureElements = document.querySelectorAll(
          sectionId 
            ? `[data-section-id="${sectionId}"] [data-lecture-id]`
            : `[data-course-id="${courseId}"] > div > [data-lecture-id]`
        );
        const lastLecture = lectureElements[lectureElements.length - 1];
        lastLecture?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } catch (err) {
      console.error('Error adding lecture:', err);
      setError('Failed to add lecture. Please try again.');
    }
  };
  
  const handleUpdateLecture = async (lectureId: string) => {
    try {
      if (!editLectureData.title) {
        setError('Lecture title is required');
        return;
      }
      
      const { data, error } = await supabase
        .from('lectures')
        .update({
          title: editLectureData.title,
          videoUrl: editLectureData.videoUrl,
          content: editLectureData.content,
          transcript: editLectureData.transcript
        })
        .eq('id', lectureId)
        .select()
        .single();
      
      if (error) throw error;
      
      setCourses(prev => prev.map(course => {
        // Check if lecture is directly in course
        if (course.lectures?.some(lecture => lecture.id === lectureId)) {
          return {
            ...course,
            lectures: course.lectures.map(lecture => 
              lecture.id === lectureId ? { ...lecture, ...data } : lecture
            )
          };
        }
        
        // Check if lecture is in a section
        if (course.sections?.some(section => 
          section.lectures?.some(lecture => lecture.id === lectureId)
        )) {
          return {
            ...course,
            sections: course.sections.map(section => {
              if (section.lectures?.some(lecture => lecture.id === lectureId)) {
                return {
                  ...section,
                  lectures: section.lectures.map(lecture => 
                    lecture.id === lectureId ? { ...lecture, ...data } : lecture
                  )
                };
              }
              return section;
            })
          };
        }
        
        return course;
      }));
      
      setEditingLecture(null);
      setEditLectureData({});
    } catch (err) {
      console.error('Error updating lecture:', err);
      setError('Failed to update lecture. Please try again.');
    }
  };
  
  const handleDeleteLecture = async (lectureId: string) => {
    if (!window.confirm('Are you sure you want to delete this lecture? This action cannot be undone.')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('lectures')
        .delete()
        .eq('id', lectureId);
      
      if (error) throw error;
      
      setCourses(prev => prev.map(course => {
        // Check if lecture is directly in course
        if (course.lectures?.some(lecture => lecture.id === lectureId)) {
          return {
            ...course,
            lectures: course.lectures.filter(lecture => lecture.id !== lectureId)
          };
        }
        
        // Check if lecture is in a section
        if (course.sections?.some(section => 
          section.lectures?.some(lecture => lecture.id === lectureId)
        )) {
          return {
            ...course,
            sections: course.sections.map(section => {
              if (section.lectures?.some(lecture => lecture.id === lectureId)) {
                return {
                  ...section,
                  lectures: section.lectures.filter(lecture => lecture.id !== lectureId)
                };
              }
              return section;
            })
          };
        }
        
        return course;
      }));
    } catch (err) {
      console.error('Error deleting lecture:', err);
      setError('Failed to delete lecture. Please try again.');
    }
  };
  
  // Handle module upload completion
  const handleModuleUploadComplete = () => {
    setUploadingModuleForLecture(null);
    // Reload courses to get updated modules
    loadCourses();
  };
  
  // Render functions
  const renderCourseForm = (isEditing: boolean, courseId?: string) => {
    const data = isEditing ? editCourseData : newCourseData;
    const setData = isEditing ? setEditCourseData : setNewCourseData;
    
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border dark:border-gray-700 mb-4">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Course Title
            </label>
            <input
              type="text"
              value={data.title || ''}
              onChange={(e) => setData({ ...data, title: e.target.value })}
              className="w-full p-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Enter course title"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={data.description || ''}
              onChange={(e) => setData({ ...data, description: e.target.value })}
              className="w-full p-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              rows={3}
              placeholder="Enter course description"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Semester
            </label>
            <input
              type="number"
              value={data.semester || ''}
              onChange={(e) => setData({ ...data, semester: parseInt(e.target.value) || 1 })}
              className="w-full p-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              min="1"
              max="8"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Thumbnail URL
            </label>
            <input
              type="text"
              value={data.thumbnail || ''}
              onChange={(e) => setData({ ...data, thumbnail: e.target.value })}
              className="w-full p-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Enter thumbnail URL"
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                if (isEditing) {
                  setEditingCourse(null);
                  setEditCourseData({});
                } else {
                  setIsAddingCourse(false);
                  setNewCourseData({
                    title: '',
                    description: '',
                    semester: 1,
                    thumbnail: ''
                  });
                }
              }}
              className="px-3 py-1 border dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={() => isEditing ? handleUpdateCourse(courseId!) : handleAddCourse()}
              className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {isEditing ? 'Update' : 'Add'} Course
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  const renderSectionForm = (courseId: string, isEditing: boolean, sectionId?: string) => {
    const data = isEditing ? editSectionData : newSectionData;
    const setData = isEditing ? setEditSectionData : setNewSectionData;
    
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border dark:border-gray-700 mb-4 ml-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Section Title
            </label>
            <input
              type="text"
              value={data.title || ''}
              onChange={(e) => setData({ ...data, title: e.target.value })}
              className="w-full p-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Enter section title"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              value={data.description || ''}
              onChange={(e) => setData({ ...data, description: e.target.value })}
              className="w-full p-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              rows={2}
              placeholder="Enter section description"
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                if (isEditing) {
                  setEditingSection(null);
                  setEditSectionData({});
                } else {
                  setIsAddingSection(null);
                  setNewSectionData({
                    title: '',
                    description: '',
                    order: 0
                  });
                }
              }}
              className="px-3 py-1 border dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={() => isEditing ? handleUpdateSection(sectionId!) : handleAddSection(courseId)}
              className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {isEditing ? 'Update' : 'Add'} Section
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  const renderLectureForm = (isEditing: boolean, lectureId?: string) => {
    const data = isEditing ? editLectureData : newLectureData;
    const setData = isEditing ? setEditLectureData : setNewLectureData;
    
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border dark:border-gray-700 mb-4 ml-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Lecture Title
            </label>
            <input
              type="text"
              value={data.title || ''}
              onChange={(e) => setData({ ...data, title: e.target.value })}
              className="w-full p-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Enter lecture title"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Video URL (YouTube embed or direct video URL)
            </label>
            <input
              type="text"
              value={data.videoUrl || ''}
              onChange={(e) => setData({ ...data, videoUrl: e.target.value })}
              className="w-full p-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Enter video URL"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Content (Markdown supported)
            </label>
            <textarea
              value={data.content || ''}
              onChange={(e) => setData({ ...data, content: e.target.value })}
              className="w-full p-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono"
              rows={6}
              placeholder="Enter lecture content in Markdown format"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Transcript (Optional)
            </label>
            <textarea
              value={data.transcript || ''}
              onChange={(e) => setData({ ...data, transcript: e.target.value })}
              className="w-full p-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              rows={4}
              placeholder="Enter lecture transcript"
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                if (isEditing) {
                  setEditingLecture(null);
                  setEditLectureData({});
                } else {
                  setIsAddingLecture(null);
                  setNewLectureData({
                    title: '',
                    videoUrl: '',
                    content: '',
                    transcript: '',
                    order: 0
                  });
                }
              }}
              className="px-3 py-1 border dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={() => isEditing ? handleUpdateLecture(lectureId!) : handleAddLecture()}
              className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {isEditing ? 'Update' : 'Add'} Lecture
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  const renderModuleUploader = (lectureId: string) => {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border dark:border-gray-700 mb-4 ml-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium">Upload Module for Lecture</h3>
          <button
            onClick={() => setUploadingModuleForLecture(null)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X size={18} />
          </button>
        </div>
        
        <ModuleUploader 
          lectureId={lectureId} 
          onUploadComplete={handleModuleUploadComplete} 
        />
      </div>
    );
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex justify-center items-center p-4">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md text-center max-w-md w-full">
          <p className="text-gray-600 dark:text-gray-300 mb-4">You need to be logged in to access the admin panel.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 group"
            >
              <ArrowLeft size={20} className="transition-transform group-hover:-translate-x-1" />
              <span>Back to Courses</span>
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Admin Dashboard</h1>
            
            {/* Tabs */}
            <div className="flex border-b dark:border-gray-700 mb-6">
              <button
                onClick={() => setActiveTab('courses')}
                className={`px-4 py-2 font-medium ${
                  activeTab === 'courses'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Book size={18} />
                  <span>Courses</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('sections')}
                className={`px-4 py-2 font-medium ${
                  activeTab === 'sections'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Layers size={18} />
                  <span>Sections</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('lectures')}
                className={`px-4 py-2 font-medium ${
                  activeTab === 'lectures'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Video size={18} />
                  <span>Lectures</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('modules')}
                className={`px-4 py-2 font-medium ${
                  activeTab === 'modules'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText size={18} />
                  <span>Modules</span>
                </div>
              </button>
            </div>
            
            {/* Error message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-red-600 dark:text-red-400 mt-0.5" size={20} />
                  <div>
                    <p className="text-red-600 dark:text-red-400">{error}</p>
                    <button
                      onClick={() => setError(null)}
                      className="text-red-600 dark:text-red-400 text-sm underline mt-1"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Add Course Button */}
            {!isAddingCourse && (
              <div className="mb-6">
                <button
                  onClick={() => setIsAddingCourse(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus size={18} />
                  <span>Add New Course</span>
                </button>
              </div>
            )}
            
            {/* Add Course Form */}
            {isAddingCourse && renderCourseForm(false)}
            
            {/* Courses List */}
            <div ref={coursesRef} className="space-y-4">
              {courses.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <Book size={48} className="mx-auto text-gray-400 dark:text-gray-500 mb-2" />
                  <p className="text-gray-600 dark:text-gray-300">No courses available</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Click the "Add New Course" button to create your first course
                  </p>
                </div>
              ) : (
                courses.map(course => (
                  <div key={course.id} data-course-id={course.id} className="border dark:border-gray-700 rounded-lg overflow-hidden">
                    {/* Course Header */}
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleCourseExpanded(course.id)}
                          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        >
                          {expandedCourses.has(course.id) ? (
                            <ChevronDown size={20} />
                          ) : (
                            <ChevronRight size={20} />
                          )}
                        </button>
                        
                        {editingCourse === course.id ? (
                          <input
                            type="text"
                            value={editCourseData.title || ''}
                            onChange={(e) => setEditCourseData({ ...editCourseData, title: e.target.value })}
                            className="p-1 border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            autoFocus
                          />
                        ) : (
                          <h3 className="font-medium text-gray-900 dark:text-gray-100">
                            {course.title}
                            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                              (Semester {course.semester})
                            </span>
                          </h3>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {editingCourse === course.id ? (
                          <>
                            <button
                              onClick={() => handleUpdateCourse(course.id)}
                              className="p-1 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                              title="Save"
                            >
                              <Save size={18} />
                            </button>
                            <button
                              onClick={() => {
                                setEditingCourse(null);
                                setEditCourseData({});
                              }}
                              className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                              title="Cancel"
                            >
                              <X size={18} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingCourse(course.id);
                                setEditCourseData({
                                  title: course.title,
                                  description: course.description,
                                  semester: course.semester,
                                  thumbnail: course.thumbnail
                                });
                              }}
                              className="p-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                              title="Edit"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteCourse(course.id)}
                              className="p-1 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                              title="Delete"
                            >
                              <Trash size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Course Content (Sections and Lectures) */}
                    {expandedCourses.has(course.id) && (
                      <div className="p-4 space-y-4">
                        {/* Course Edit Form */}
                        {editingCourse === course.id && renderCourseForm(true, course.id)}
                        
                        {/* Add Section Button */}
                        {isAddingSection !== course.id && (
                          <div className="ml-6 mb-4">
                            <button
                              onClick={() => setIsAddingSection(course.id)}
                              className="flex items-center gap-2 px-3 py-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 border border-blue-200 dark:border-blue-800 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            >
                              <Plus size={16} />
                              <span>Add Section</span>
                            </button>
                          </div>
                        )}
                        
                        {/* Add Section Form */}
                        {isAddingSection === course.id && renderSectionForm(course.id, false)}
                        
                        {/* Sections */}
                        {course.sections && course.sections.length > 0 && (
                          <div ref={sectionsRef} className="space-y-3 ml-6">
                            {course.sections.map(section => (
                              <div key={section.id} data-section-id={section.id} className="border dark:border-gray-700 rounded-lg overflow-hidden">
                                {/* Section Header */}
                                <div className="bg-gray-50 dark:bg-gray-700 p-3 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => toggleSectionExpanded(section.id)}
                                      className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                    >
                                      {expandedSections.has(section.id) ? (
                                        <ChevronDown size={18} />
                                      ) : (
                                        <ChevronRight size={18} />
                                      )}
                                    </button>
                                    
                                    {editingSection === section.id ? (
                                      <input
                                        type="text"
                                        value={editSectionData.title || ''}
                                        onChange={(e) => setEditSectionData({ ...editSectionData, title: e.target.value })}
                                        className="p-1 border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                        autoFocus
                                      />
                                    ) : (
                                      <h4 className="font-medium text-gray-800 dark:text-gray-200">
                                        {section.title}
                                      </h4>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    {editingSection === section.id ? (
                                      <>
                                        <button
                                          onClick={() => handleUpdateSection(section.id)}
                                          className="p-1 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                                          title="Save"
                                        >
                                          <Save size={16} />
                                        </button>
                                        <button
                                          onClick={() => {
                                            setEditingSection(null);
                                            setEditSectionData({});
                                          }}
                                          className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                          title="Cancel"
                                        >
                                          <X size={16} />
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() => {
                                            setEditingSection(section.id);
                                            setEditSectionData({
                                              title: section.title,
                                              description: section.description
                                            });
                                          }}
                                          className="p-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                                          title="Edit"
                                        >
                                          <Edit size={16} />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteSection(section.id)}
                                          className="p-1 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                          title="Delete"
                                        >
                                          <Trash size={16} />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Section Content (Lectures) */}
                                {expandedSections.has(section.id) && (
                                  <div className="p-3 space-y-3">
                                    {/* Section Edit Form */}
                                    {editingSection === section.id && renderSectionForm(course.id, true, section.id)}
                                    
                                    {/* Add Lecture Button */}
                                    {isAddingLecture?.courseId !== course.id || isAddingLecture?.sectionId !== section.id ? (
                                      <div className="mb-3">
                                        <button
                                          onClick={() => setIsAddingLecture({ courseId: course.id, sectionId: section.id })}
                                          className="flex items-center gap-2 px-3 py-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 border border-blue-200 dark:border-blue-800 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                        >
                                          <Plus size={16} />
                                          <span>Add Lecture</span>
                                        </button>
                                      </div>
                                    ) : null}
                                    
                                    {/* Add Lecture Form */}
                                    {isAddingLecture?.courseId === course.id && isAddingLecture?.sectionId === section.id && renderLectureForm(false)}
                                    
                                    {/* Lectures */}
                                    {section.lectures && section.lectures.length > 0 ? (
                                      <div ref={lecturesRef} className="space-y-2">
                                        {section.lectures.map(lecture => (
                                          <div key={lecture.id} data-lecture-id={lecture.id} className="border dark:border-gray-700 rounded-lg p-3">
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-2">
                                                <Video size={16} className="text-gray-500 dark:text-gray-400" />
                                                
                                                {editingLecture === lecture.id ? (
                                                  <input
                                                    type="text"
                                                    value={editLectureData.title || ''}
                                                    onChange={(e) => setEditLectureData({ ...editLectureData, title: e.target.value })}
                                                    className="p-1 border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                                    autoFocus
                                                  />
                                                ) : (
                                                  <span className="text-gray-800 dark:text-gray-200">
                                                    {lecture.title}
                                                  </span>
                                                )}
                                              </div>
                                              
                                              <div className="flex items-center gap-2">
                                                {editingLecture === lecture.id ? (
                                                  <>
                                                    <button
                                                      onClick={() => handleUpdateLecture(lecture.id)}
                                                      className="p-1 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                                                      title="Save"
                                                    >
                                                      <Save size={16} />
                                                    </button>
                                                    <button
                                                      onClick={() => {
                                                        setEditingLecture(null);
                                                        setEditLectureData({});
                                                      }}
                                                      className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                                      title="Cancel"
                                                    >
                                                      <X size={16} />
                                                    </button>
                                                  </>
                                                ) : (
                                                  <>
                                                    <button
                                                      onClick={() => setUploadingModuleForLecture(lecture.id)}
                                                      className="p-1 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                                                      title="Upload Module"
                                                    >
                                                      <Upload size={16} />
                                                    </button>
                                                    <button
                                                      onClick={() => {
                                                        setEditingLecture(lecture.id);
                                                        setEditLectureData({
                                                          title: lecture.title,
                                                          videoUrl: lecture.videoUrl,
                                                          content: lecture.content,
                                                          transcript: lecture.transcript
                                                        });
                                                      }}
                                                      className="p-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                                                      title="Edit"
                                                    >
                                                      <Edit size={16} />
                                                    </button>
                                                    <button
                                                      onClick={() => handleDeleteLecture(lecture.id)}
                                                      className="p-1 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                                      title="Delete"
                                                    >
                                                      <Trash size={16} />
                                                    </button>
                                                  </>
                                                )}
                                              </div>
                                            </div>
                                            
                                            {/* Lecture Edit Form */}
                                            {editingLecture === lecture.id && renderLectureForm(true, lecture.id)}
                                            
                                            {/* Module Uploader */}
                                            {uploadingModuleForLecture === lecture.id && renderModuleUploader(lecture.id)}
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-center py-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                          No lectures in this section
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Add Lecture Button (directly to course) */}
                        {isAddingLecture?.courseId !== course.id || isAddingLecture?.sectionId !== undefined ? (
                          <div className="ml-6 mb-4">
                            <button
                              onClick={() => setIsAddingLecture({ courseId: course.id })}
                              className="flex items-center gap-2 px-3 py-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 border border-blue-200 dark:border-blue-800 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            >
                              <Plus size={16} />
                              <span>Add Lecture (No Section)</span>
                            </button>
                          </div>
                        ) : null}
                        
                        {/* Add Lecture Form (directly to course) */}
                        {isAddingLecture?.courseId === course.id && isAddingLecture?.sectionId === undefined && renderLectureForm(false)}
                        
                        {/* Lectures (directly in course) */}
                        {course.lectures && course.lectures.filter(l => !l.section_id).length > 0 && (
                          <div className="space-y-2 ml-6">
                            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Lectures (No Section)</h4>
                            {course.lectures.filter(l => !l.section_id).map(lecture => (
                              <div key={lecture.id} data-lecture-id={lecture.id} className="border dark:border-gray-700 rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Video size={16} className="text-gray-500 dark:text-gray-400" />
                                    
                                    {editingLecture === lecture.id ? (
                                      <input
                                        type="text"
                                        value={editLectureData.title || ''}
                                        onChange={(e) => setEditLectureData({ ...editLectureData, title: e.target.value })}
                                        className="p-1 border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                        autoFocus
                                      />
                                    ) : (
                                      <span className="text-gray-800 dark:text-gray-200">
                                        {lecture.title}
                                      </span>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    {editingLecture === lecture.id ? (
                                      <>
                                        <button
                                          onClick={() => handleUpdateLecture(lecture.id)}
                                          className="p-1 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                                          title="Save"
                                        >
                                          <Save size={16} />
                                        </button>
                                        <button
                                          onClick={() => {
                                            setEditingLecture(null);
                                            setEditLectureData({});
                                          }}
                                          className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                          title="Cancel"
                                        >
                                          <X size={16} />
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() => setUploadingModuleForLecture(lecture.id)}
                                          className="p-1 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                                          title="Upload Module"
                                        >
                                          <Upload size={16} />
                                        </button>
                                        <button
                                          onClick={() => {
                                            setEditingLecture(lecture.id);
                                            setEditLectureData({
                                              title: lecture.title,
                                              videoUrl: lecture.videoUrl,
                                              content: lecture.content,
                                              transcript: lecture.transcript
                                            });
                                          }}
                                          className="p-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                                          title="Edit"
                                        >
                                          <Edit size={16} />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteLecture(lecture.id)}
                                          className="p-1 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                          title="Delete"
                                        >
                                          <Trash size={16} />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Lecture Edit Form */}
                                {editingLecture === lecture.id && renderLectureForm(true, lecture.id)}
                                
                                {/* Module Uploader */}
                                {uploadingModuleForLecture === lecture.id && renderModuleUploader(lecture.id)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}