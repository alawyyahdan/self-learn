import React, { useState, useEffect } from 'react';
import { Download, FileText, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Module } from '../types';

interface ModuleListProps {
  lectureId: string;
}

export function ModuleList({ lectureId }: ModuleListProps) {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModules = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .eq('lecture_id', lectureId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setModules(data || []);
    } catch (err) {
      console.error('Error fetching modules:', err);
      setError('Failed to load modules. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, [lectureId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-red-600 dark:text-red-400" size={20} />
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
          <button
            onClick={fetchModules}
            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>
    );
  }

  if (modules.length === 0) {
    return (
      <div className="text-center py-6 border dark:border-gray-700 rounded-lg">
        <FileText size={32} className="mx-auto text-gray-400 dark:text-gray-500 mb-2" />
        <p className="text-gray-500 dark:text-gray-400">No modules available for this lecture</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {modules.map((module) => (
        <div 
          key={module.id} 
          className="bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-lg p-4 shadow-sm"
        >
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100">{module.title}</h4>
              {module.description && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{module.description}</p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {new Date(module.created_at).toLocaleDateString()}
              </p>
            </div>
            <a
              href={module.file_url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 p-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30"
              title="Download module"
            >
              <Download size={18} />
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}