import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create a singleton instance with improved configuration
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'X-Client-Info': 'learning-platform@1.0.0'
    }
  },
  // Add storage configuration
  storage: {
    // Retry failed uploads
    retryAttempts: 3,
    // Exponential backoff for retries
    retryInterval: 500
  }
});

// Function to fetch courses with proper error handling and retries
export async function fetchCourses(maxRetries = 3) {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          sections!sections_course_id_fkey (
            *,
            lectures!lectures_section_id_fkey (*)
          ),
          lectures!lectures_course_id_fkey (*)
        `)
        .order('semester');

      if (error) {
        console.error(`Fetch courses failed (attempt ${attempt + 1}):`, error);
        lastError = error;
        
        if (attempt === maxRetries - 1) {
          return []; // Return empty array on final failure
        }
        
        // Wait before retrying with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, attempt), 5000)));
        continue;
      }
      
      if (!data) {
        return [];
      }

      // Sort sections and lectures
      return data.map(course => ({
        ...course,
        lectures: course.lectures?.sort((a, b) => a.order - b.order) || [],
        sections: course.sections?.sort((a, b) => a.order - b.order).map(section => ({
          ...section,
          lectures: section.lectures?.sort((a, b) => a.order - b.order) || []
        })) || []
      }));
    } catch (error) {
      console.error(`Fetch courses failed (attempt ${attempt + 1}):`, error);
      lastError = error;
      
      if (attempt === maxRetries - 1) {
        return []; // Return empty array on final failure
      }
      
      await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, attempt), 5000)));
    }
  }
  
  return []; // Return empty array if all retries failed
}

// Helper function to execute database operations with retries
export async function executeQuery<T>(
  operation: () => Promise<{ data: T | null; error: any }>,
  maxRetries = 3
): Promise<T | null> {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const { data, error } = await operation();
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error(`Database operation failed (attempt ${attempt + 1}):`, error);
      lastError = error;
      
      if (attempt === maxRetries - 1) {
        return null; // Return null on final failure
      }
      
      await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, attempt), 5000)));
    }
  }
  
  return null;
}

// Initialize Supabase connection
export async function initializeSupabase() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  } catch (error) {
    console.error('Error initializing Supabase:', error);
    return false;
  }
}