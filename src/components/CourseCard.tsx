import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Course } from '../types';
import { BookOpen } from 'lucide-react';

interface CourseCardProps {
  course: Course;
}

export function CourseCard({ course }: CourseCardProps) {
  const navigate = useNavigate();

  return (
    <div 
      onClick={() => navigate(`/course/${course.id}`)}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden cursor-pointer transform transition hover:scale-105"
    >
      <img 
        src={course.thumbnail} 
        alt={course.title} 
        className="w-full h-48 object-cover"
      />
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{course.title}</h3>
          <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm font-medium px-2.5 py-0.5 rounded">
            Semester {course.semester}
          </span>
        </div>
        <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">{course.description}</p>
        <div className="flex items-center text-gray-500 dark:text-gray-400">
          <BookOpen size={16} className="mr-2" />
          <span>{course.lectures?.length || 0} lectures</span>
        </div>
      </div>
    </div>
  );
}