import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Course, Lecture, Section } from '../types';
import { supabase } from '../lib/supabase';
import { Book, ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';

export function CourseLecturesPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchCourse() {
      try {
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select(`
            *,
            sections (
              id,
              title,
              description,
              "order"
            ),
            lectures (
              id,
              title,
              "order",
              section_id
            )
          `)
          .eq('id', courseId)
          .single();

        if (courseError) throw courseError;
        
        // Sort sections and lectures by order
        if (courseData.sections) {
          courseData.sections.sort((a: Section, b: Section) => a.order - b.order);
        }
        if (courseData.lectures) {
          courseData.lectures.sort((a: Lecture, b: Lecture) => a.order - b.order);
        }
        
        setCourse(courseData);
        
        // Initially expand all sections
        if (courseData.sections) {
          setExpandedSections(new Set(courseData.sections.map(section => section.id)));
        }
      } catch (error) {
        console.error('Error fetching course:', error);
      } finally {
        setLoading(false);
      }
    }

    if (courseId) {
      fetchCourse();
    }
  }, [courseId]);

  const toggleSection = (sectionId: string) => {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex justify-center items-center">
        <p className="text-gray-600 dark:text-gray-400">Course not found</p>
      </div>
    );
  }

  const unsectionedLectures = course.lectures?.filter(lecture => !lecture.section_id) || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            <ArrowLeft size={20} />
            Back to Courses
          </button>
          <ThemeToggle />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{course.title}</h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{course.description}</p>
            
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Book size={20} className="text-blue-600 dark:text-blue-400" />
                Course Content
              </h2>
              
              <div className="space-y-4">
                {/* Sections with their lectures */}
                {course.sections && course.sections.map((section, sectionIndex) => {
                  const sectionLectures = course.lectures?.filter(
                    lecture => lecture.section_id === section.id
                  ) || [];

                  if (sectionLectures.length === 0) return null;

                  return (
                    <div key={section.id} className="border dark:border-gray-700 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleSection(section.id)}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 dark:text-gray-500 font-medium">
                            Section {sectionIndex + 1}
                          </span>
                          <h3 className="font-medium text-gray-900 dark:text-gray-100">{section.title}</h3>
                        </div>
                        {expandedSections.has(section.id) ? (
                          <ChevronDown size={20} className="text-gray-500 dark:text-gray-400" />
                        ) : (
                          <ChevronRight size={20} className="text-gray-500 dark:text-gray-400" />
                        )}
                      </button>

                      {expandedSections.has(section.id) && (
                        <div className="divide-y dark:divide-gray-700">
                          {sectionLectures.map((lecture, lectureIndex) => (
                            <div
                              key={lecture.id}
                              onClick={() => navigate(`/course/${courseId}/lecture/${lecture.id}`)}
                              className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors flex items-center gap-4"
                            >
                              <span className="text-gray-400 dark:text-gray-500 font-medium min-w-[2rem]">
                                {String(lectureIndex + 1).padStart(2, '0')}
                              </span>
                              <h4 className="text-gray-800 dark:text-gray-200">{lecture.title}</h4>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Unsectioned lectures */}
                {unsectionedLectures.length > 0 && (
                  <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">Additional Lectures</h3>
                    </div>
                    <div className="divide-y dark:divide-gray-700">
                      {unsectionedLectures.map((lecture, index) => (
                        <div
                          key={lecture.id}
                          onClick={() => navigate(`/course/${courseId}/lecture/${lecture.id}`)}
                          className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors flex items-center gap-4"
                        >
                          <span className="text-gray-400 dark:text-gray-500 font-medium min-w-[2rem]">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <h4 className="text-gray-800 dark:text-gray-200">{lecture.title}</h4>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}