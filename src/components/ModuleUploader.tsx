import React, { useState } from 'react';
import { Upload, X, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ModuleUploaderProps {
  lectureId: string;
  onUploadComplete: () => void;
}

export function ModuleUploader({ lectureId, onUploadComplete }: ModuleUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) return;

    setUploading(true);
    setError(null);

    try {
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${lectureId}/${fileName}`;

      // Upload the file to the module-files bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('module-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error('Failed to upload file. Please try again.');
      }

      // Get the public URL for the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from('module-files')
        .getPublicUrl(filePath);

      // Create module record in database
      const { error: dbError } = await supabase
        .from('modules')
        .insert({
          title,
          description,
          file_url: publicUrl,
          lecture_id: lectureId
        });

      if (dbError) {
        console.error('Database error:', dbError);
        throw new Error('Failed to save module information. Please try again.');
      }

      // Reset form
      setFile(null);
      setTitle('');
      setDescription('');
      onUploadComplete();
    } catch (error) {
      console.error('Error uploading module:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload module. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Module Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Description (Optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          rows={3}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          File
        </label>
        <div className="flex items-center justify-center w-full">
          <label className="w-full flex flex-col items-center px-4 py-6 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg border-2 border-dashed dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600">
            <Upload className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            <span className="mt-2 text-sm">
              {file ? file.name : 'Select a file'}
            </span>
            <input
              type="file"
              className="hidden"
              onChange={handleFileChange}
              required
            />
          </label>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" size={16} />
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={uploading || !file || !title}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 dark:disabled:bg-blue-500/50 flex items-center justify-center gap-2 transition-colors"
      >
        {uploading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            Uploading...
          </>
        ) : (
          <>
            <Upload size={20} />
            Upload Module
          </>
        )}
      </button>
    </form>
  );
}