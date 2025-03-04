import React, { useState } from 'react';
import { Brain, Save, AlertCircle, Globe } from 'lucide-react';
import { getChatCompletion } from '../lib/openai';
import { useTheme } from '../context/ThemeContext';

interface TestGeneratorProps {
  lectureId: string;
  content: string;
  transcript: string;
  onTestGenerated: () => void;
}

interface Question {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

type Language = 'en' | 'id';

export function TestGenerator({ lectureId, content, transcript, onTestGenerated }: TestGeneratorProps) {
  const { theme } = useTheme();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>('en');

  const validateQuestions = (questions: any[]): questions is Question[] => {
    return questions.every(q => 
      typeof q.question === 'string' &&
      Array.isArray(q.options) &&
      q.options.length === 4 &&
      q.options.every(opt => typeof opt === 'string') &&
      typeof q.correctIndex === 'number' &&
      q.correctIndex >= 0 &&
      q.correctIndex < 4 &&
      typeof q.explanation === 'string'
    );
  };

  const generateTest = async () => {
    setGenerating(true);
    setError(null);

    try {
      if (!content && !transcript) {
        throw new Error('No lecture content or transcript available');
      }

      // Clean and truncate content to avoid token limits
      const cleanContent = content.slice(0, 3000); // Limit content length
      const cleanTranscript = transcript?.slice(0, 1500) || ''; // Limit transcript length

      const languageInstructions = language === 'id' 
        ? 'Buat pertanyaan dalam Bahasa Indonesia. Semua pertanyaan, pilihan jawaban, dan penjelasan harus dalam Bahasa Indonesia.'
        : 'Create questions in English. All questions, options, and explanations should be in English.';

      // Generate test questions using ChatGPT
      const prompt = `
        ${languageInstructions}

        Create 10 multiple choice questions based on this lecture content:

        ${cleanContent}

        ${cleanTranscript ? `Additional context from transcript:\n${cleanTranscript}` : ''}

        Requirements:
        1. Generate exactly 10 questions
        2. Each question must have exactly 4 options
        3. Only one option should be correct
        4. Include a brief explanation for the correct answer
        5. IMPORTANT: Vary the position of the correct answer randomly (don't always put it in the same position)
        6. Make sure the correct answer is distributed evenly across positions (A, B, C, D)

        Return the response in this exact JSON format:
        {
          "questions": [
            {
              "question": "Question text here?",
              "options": ["Option A", "Option B", "Option C", "Option D"],
              "correctIndex": 0,
              "explanation": "Why this answer is correct"
            }
          ]
        }

        IMPORTANT: 
        - The response must be valid JSON
        - Each question must follow the exact format above
        - The correctIndex must be 0-3 (corresponding to the correct option's position)
        - Distribute the correct answers evenly across all positions (0, 1, 2, 3)
        ${language === 'id' ? '- All text must be in Bahasa Indonesia' : '- All text must be in English'}
      `;

      console.log('Generating test questions...');
      
      // Set a timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out after 30 seconds')), 30000);
      });

      // Race the API call with the timeout
      const response = await Promise.race([
        getChatCompletion([{ role: 'user', content: prompt }]),
        timeoutPromise
      ]) as any;
      
      if (!response?.content) {
        throw new Error('No response from AI service');
      }

      console.log('Parsing AI response...');
      let parsedResponse;
      try {
        // Extract JSON from the response if it's wrapped in markdown code blocks
        const content = response.content;
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                         content.match(/```\n([\s\S]*?)\n```/) ||
                         content.match(/{[\s\S]*}/);
                         
        const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
        parsedResponse = JSON.parse(jsonString.trim());
      } catch (e) {
        console.error('Failed to parse AI response:', response.content);
        throw new Error('Invalid JSON response from AI service');
      }

      const questions = parsedResponse.questions || parsedResponse;
      
      if (!Array.isArray(questions) || questions.length === 0) {
        console.error('Invalid questions array:', questions);
        throw new Error(`Expected questions array, got ${typeof questions}`);
      }

      if (questions.length < 10) {
        console.warn(`Expected 10 questions, got ${questions.length}`);
        throw new Error(`Not enough questions generated (${questions.length}). Please try again.`);
      }

      if (!validateQuestions(questions)) {
        console.error('Invalid question format:', questions);
        throw new Error('Questions do not match required format');
      }

      // Verify distribution of correct answers
      const correctPositions = questions.map(q => q.correctIndex);
      const positionCounts = [0, 0, 0, 0]; // Count for positions 0, 1, 2, 3
      
      correctPositions.forEach(pos => {
        if (pos >= 0 && pos < 4) {
          positionCounts[pos]++;
        }
      });
      
      console.log('Correct answer distribution:', positionCounts);
      
      // If the distribution is too uneven, shuffle some of the options
      const finalQuestions = questions.slice(0, 10).map((q, i) => {
        // For questions where the correct answer is in an overrepresented position,
        // randomly shuffle the options and update the correctIndex
        if (Math.random() > 0.7) { // Only shuffle some questions to maintain some of the original structure
          const correctOption = q.options[q.correctIndex];
          const otherOptions = q.options.filter((_, idx) => idx !== q.correctIndex);
          
          // Shuffle the other options
          for (let i = otherOptions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [otherOptions[i], otherOptions[j]] = [otherOptions[j], otherOptions[i]];
          }
          
          // Insert the correct option at a random position
          const newCorrectIndex = Math.floor(Math.random() * 4);
          const newOptions = [...otherOptions];
          newOptions.splice(newCorrectIndex, 0, correctOption);
          
          return {
            ...q,
            options: newOptions.slice(0, 4), // Ensure we have exactly 4 options
            correctIndex: newCorrectIndex
          };
        }
        
        return q;
      });

      console.log('Storing test in localStorage...');
      localStorage.setItem(`test_${lectureId}`, JSON.stringify({
        questions: finalQuestions,
        currentQuestion: 0,
        correctAnswers: 0,
        completed: false,
        language
      }));

      onTestGenerated();
    } catch (error) {
      console.error('Error generating test:', error);
      setError(
        error instanceof Error 
          ? error.message 
          : 'Failed to generate test. Please try again.'
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border dark:border-gray-700 transition-colors duration-200">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Brain className="text-blue-600 dark:text-blue-400" />
        Generate Multiple Choice Test
      </h3>
      
      <p className="text-gray-600 dark:text-gray-300 mb-4">
        Generate a multiple-choice test to assess your understanding of the lecture content.
        You need to answer all 10 questions correctly to complete the test.
      </p>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
          <Globe size={18} className="text-blue-600 dark:text-blue-400" />
          Test Language
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
              language === 'en'
                ? 'bg-blue-600 text-white border-blue-600 dark:border-blue-500'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => setLanguage('id')}
            className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
              language === 'id'
                ? 'bg-blue-600 text-white border-blue-600 dark:border-blue-500'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            Bahasa Indonesia
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-red-600 dark:text-red-400 mt-0.5" size={20} />
            <div>
              <p className="font-medium text-red-600 dark:text-red-400">Error Generating Test</p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={generateTest}
        disabled={generating}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 dark:disabled:bg-blue-500/50 flex items-center justify-center gap-2 transition-colors"
      >
        {generating ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            <span>{language === 'id' ? 'Membuat Tes...' : 'Generating Test...'}</span>
          </>
        ) : (
          <>
            <Save size={20} />
            <span>{language === 'id' ? 'Buat Tes Pilihan Ganda' : 'Generate Multiple Choice Test'}</span>
          </>
        )}
      </button>
    </div>
  );
}