import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { VideoPlayer } from '../components/VideoPlayer';
import { Course, Lecture, Test, Grade } from '../types';
import { Book, FileText, Info, ArrowLeft, ArrowRight, ChevronLeft, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AIChat } from '../components/AIChat';
import { TestTaker } from '../components/TestTaker';
import { TestGenerator } from '../components/TestGenerator';
import { ModuleList } from '../components/ModuleList';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { ThemeToggle } from '../components/ThemeToggle';

export function LecturePage() {
  const { courseId, lectureId } = useParams();
  const navigate = useNavigate();
  const [showTranscript, setShowTranscript] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [course, setCourse] = useState<Course | null>(null);
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [test, setTest] = useState<Test | null>(null);
  const [grade, setGrade] = useState<Grade | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testGenerated, setTestGenerated] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!courseId || !lectureId) {
        setError('Invalid course or lecture ID');
        setLoading(false);
        return;
      }

      try {
        // Fetch course data with lectures and sections
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select(`
            *,
            lectures!lectures_course_id_fkey (*),
            sections!sections_course_id_fkey (*)
          `)
          .eq('id', courseId)
          .single();

        if (courseError) throw courseError;
        
        // Sort lectures and sections
        if (courseData) {
          courseData.lectures?.sort((a, b) => a.order - b.order);
          courseData.sections?.sort((a, b) => a.order - b.order);
          setCourse(courseData);
        }

        // Fetch lecture data
        const { data: lectureData, error: lectureError } = await supabase
          .from('lectures')
          .select('*')
          .eq('id', lectureId)
          .single();

        if (lectureError) throw lectureError;
        if (lectureData) {
          setLecture(lectureData);
        }

        // Fetch test data if it exists
        try {
          const { data: testData } = await supabase
            .from('tests')
            .select('*')
            .eq('lecture_id', lectureId)
            .single();

          if (testData) {
            setTest(testData);

            // If test exists and user is authenticated, fetch their grade
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              try {
                const { data: gradeData } = await supabase
                  .from('grades')
                  .select('*')
                  .eq('test_id', testData.id)
                  .eq('user_id', user.id)
                  .single();

                if (gradeData) {
                  setGrade(gradeData);
                }
              } catch (gradeError) {
                // It's okay if there's no grade yet
                console.log('No grade found for this user and test');
              }
            }
          }
        } catch (testError) {
          // It's okay if there's no test yet
          console.log('No test found for this lecture');
        }

        // Check if there's a test in localStorage
        const savedTest = localStorage.getItem(`test_${lectureId}`);
        if (savedTest) {
          setTestGenerated(true);
        }

        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load course content. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [courseId, lectureId]);

  const currentLectureIndex = course?.lectures?.findIndex(l => l.id === lectureId) ?? -1;
  const previousLecture = currentLectureIndex > 0 ? course?.lectures?.[currentLectureIndex - 1] : null;
  const nextLecture = currentLectureIndex < (course?.lectures?.length ?? 0) - 1 
    ? course?.lectures?.[currentLectureIndex + 1] 
    : null;

  const handleTestComplete = (passed: boolean) => {
    if (passed && nextLecture) {
      navigate(`/course/${courseId}/lecture/${nextLecture.id}`);
    }
  };

  const handleTestGenerated = () => {
    setTestGenerated(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex justify-center items-center p-4">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md text-center max-w-md w-full">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!course || !lecture) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex justify-center items-center">
        <p className="text-gray-600 dark:text-gray-400">Course or lecture not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <div className="max-w-[1600px] mx-auto px-4 py-8">
        {/* Navigation Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => navigate(`/course/${courseId}`)}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 group"
            >
              <ChevronLeft size={20} className="transition-transform group-hover:-translate-x-1" />
              Back to Course
            </button>
            <ThemeToggle />
          </div>
          
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{course.title}</h1>
              <h2 className="text-xl text-gray-600 dark:text-gray-300">{lecture.title}</h2>
            </div>
            
            <div className="flex items-center gap-3">
              {previousLecture && (
                <button
                  onClick={() => navigate(`/course/${courseId}/lecture/${previousLecture.id}`)}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <ArrowLeft size={20} className="hidden sm:inline" />
                  <span>Previous</span>
                </button>
              )}
              
              {nextLecture && (!test || grade?.passed) && (
                <button
                  onClick={() => navigate(`/course/${courseId}/lecture/${nextLecture.id}`)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <span>Next</span>
                  <ArrowRight size={20} className="hidden sm:inline" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-8">
          {/* Main Content */}
          <div className="col-span-12 lg:col-span-8 space-y-8">
            {/* Video Player */}
            {lecture.videoUrl && (
              <VideoPlayer 
                videoUrl={lecture.videoUrl} 
                title={lecture.title}
              />
            )}

            {/* Course Information */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center gap-2 mb-4">
                <Info size={20} className="text-blue-600 dark:text-blue-400" />
                <h3 className="text-xl font-semibold">Course Information</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-6">{course.description}</p>
              <div className="border-t dark:border-gray-700 pt-4">
                <h4 className="font-semibold mb-2">About This Course</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  This course is part of semester {course.semester}
                </p>
              </div>
            </div>
            
            {/* Course Content */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <Book size={20} className="text-blue-600 dark:text-blue-400" />
                  Course Content
                </h3>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowTranscript(!showTranscript)}
                    className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                  >
                    <FileText size={20} />
                    <span className="hidden sm:inline">
                      {showTranscript ? 'Hide' : 'Show'} Transcript
                    </span>
                  </button>
                  <button
                    onClick={() => setShowAIChat(!showAIChat)}
                    className="lg:hidden flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                  >
                    <Info size={20} />
                    <span className="hidden sm:inline">
                      {showAIChat ? 'Hide' : 'Show'} AI Assistant
                    </span>
                  </button>
                </div>
              </div>
              
              <div className="prose dark:prose-invert max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {lecture.content || '*No content available*'}
                </ReactMarkdown>
              </div>

              {showTranscript && lecture.transcript && (
                <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <h4 className="font-semibold mb-2">Lecture Transcript</h4>
                  <p className="text-gray-600 dark:text-gray-300">{lecture.transcript}</p>
                </div>
              )}
            </div>

            {/* Lecture Modules */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center gap-2 mb-4">
                <Download size={20} className="text-blue-600 dark:text-blue-400" />
                <h3 className="text-xl font-semibold">Lecture Materials</h3>
              </div>
              <ModuleList lectureId={lectureId || ''} />
            </div>

            {/* Test Section */}
            {test ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-xl font-semibold mb-4">Lecture Test</h3>
                {grade ? (
                  <div className={`p-4 rounded-lg ${grade.passed ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                    <p className="font-medium">
                      Your score: {grade.score}% ({grade.passed ? 'Passed' : 'Failed'})
                    </p>
                    {!grade.passed && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                        You need to pass this test to proceed to the next lecture.
                      </p>
                    )}
                  </div>
                ) : (
                  <TestTaker
                    lectureId={lectureId || ''}
                    onTestComplete={handleTestComplete}
                  />
                )}
              </div>
            ) : testGenerated ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-xl font-semibold mb-4">Lecture Test</h3>
                <TestTaker
                  lectureId={lectureId || ''}
                  onTestComplete={handleTestComplete}
                />
              </div>
            ) : (
              <TestGenerator
                lectureId={lectureId || ''}
                content={lecture.content || ''}
                transcript={lecture.transcript || ''}
                onTestGenerated={handleTestGenerated}
              />
            )}
          </div>

          {/* AI Chat Sidebar */}
          <div className={`
            col-span-12 lg:col-span-4
            ${showAIChat ? 'block' : 'hidden lg:block'}
          `}>
            <div className="lg:sticky lg:top-8 h-[600px] lg:h-[calc(100vh-8rem)]">
              <AIChat lectureId={lectureId || ''} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}