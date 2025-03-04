import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface TestTakerProps {
  lectureId: string;
  onTestComplete: (passed: boolean) => void;
}

interface Question {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface TestState {
  questions: Question[];
  currentQuestion: number;
  correctAnswers: number;
  completed: boolean;
  language?: 'en' | 'id';
}

export function TestTaker({ lectureId, onTestComplete }: TestTakerProps) {
  const { theme } = useTheme();
  const [testState, setTestState] = useState<TestState | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    loadTest();
  }, [lectureId]);

  const loadTest = () => {
    try {
      setLoading(true);
      setError(null);
      
      const savedTest = localStorage.getItem(`test_${lectureId}`);
      if (savedTest) {
        const parsedTest = JSON.parse(savedTest);
        setTestState(parsedTest);
        
        // If the test is already completed, show results immediately
        if (parsedTest.completed) {
          setShowResults(true);
        }
      } else {
        setError("No test found. Please generate a test first.");
      }
    } catch (err) {
      console.error("Error loading test:", err);
      setError("Failed to load test data. Please try generating the test again.");
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  };

  const handleAnswerSubmit = () => {
    if (!testState || selectedAnswer === null) return;

    const currentQuestion = testState.questions[testState.currentQuestion];
    const correct = selectedAnswer === currentQuestion.correctIndex;
    setIsCorrect(correct);
    setShowFeedback(true);

    const newState = {
      ...testState,
      correctAnswers: correct ? testState.correctAnswers + 1 : testState.correctAnswers
    };

    // Wait 2 seconds before moving to next question
    setTimeout(() => {
      if (testState.currentQuestion < testState.questions.length - 1) {
        // Move to next question
        newState.currentQuestion += 1;
        setTestState(newState);
        setSelectedAnswer(null);
        setShowFeedback(false);
      } else {
        // Test complete
        newState.completed = true;
        setTestState(newState);
        setShowResults(true);
        const passed = newState.correctAnswers === testState.questions.length;
        onTestComplete(passed);
      }
      localStorage.setItem(`test_${lectureId}`, JSON.stringify(newState));
    }, 2000);
  };

  const handleRetryTest = () => {
    setRetrying(true);
    
    // Create a new test state with the same questions but reset progress
    if (testState) {
      // Shuffle the questions for a different experience
      const shuffledQuestions = [...testState.questions].sort(() => Math.random() - 0.5);
      
      // For each question, shuffle the options but keep the correct answer
      const reshuffledQuestions = shuffledQuestions.map(question => {
        const correctOption = question.options[question.correctIndex];
        const otherOptions = question.options.filter((_, idx) => idx !== question.correctIndex);
        
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
          ...question,
          options: newOptions,
          correctIndex: newCorrectIndex
        };
      });
      
      const newTestState = {
        ...testState,
        questions: reshuffledQuestions,
        currentQuestion: 0,
        correctAnswers: 0,
        completed: false
      };
      
      localStorage.setItem(`test_${lectureId}`, JSON.stringify(newTestState));
      setTestState(newTestState);
      setSelectedAnswer(null);
      setShowFeedback(false);
      setShowResults(false);
    } else {
      // If there's no test state, try to reload it
      loadTest();
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
        <p className="text-gray-600 dark:text-gray-300 mt-4">Loading test...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Reload Page
        </button>
      </div>
    );
  }

  if (!testState) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 dark:text-gray-300">No test available. Please generate a test first.</p>
      </div>
    );
  }

  const isIndonesian = testState.language === 'id';
  const totalQuestions = testState.questions.length;
  
  if (showResults) {
    return (
      <div className="space-y-6 p-4">
        <div className={`text-center p-6 rounded-lg ${testState.correctAnswers === totalQuestions ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
          <div className="flex justify-center mb-4">
            {testState.correctAnswers === totalQuestions ? (
              <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
            ) : (
              <XCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
            )}
          </div>
          <h3 className="text-xl font-bold mb-2">
            {testState.correctAnswers === totalQuestions 
              ? (isIndonesian ? 'Nilai Sempurna!' : 'Perfect Score!') 
              : (isIndonesian ? 'Terus Berusaha!' : 'Keep Trying!')}
          </h3>
          <p className="text-lg mb-2">
            {isIndonesian 
              ? `Anda menjawab ${testState.correctAnswers} dari ${totalQuestions} pertanyaan dengan benar`
              : `You got ${testState.correctAnswers} out of ${totalQuestions} questions correct`}
          </p>
          <p className={testState.correctAnswers === totalQuestions ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
            {testState.correctAnswers === totalQuestions 
              ? (isIndonesian 
                  ? 'Selamat! Anda telah menguasai materi kuliah ini.' 
                  : 'Congratulations! You have mastered this lecture.') 
              : (isIndonesian 
                  ? `Anda perlu menjawab semua ${totalQuestions} pertanyaan dengan benar untuk lulus. Coba lagi!` 
                  : `You need all ${totalQuestions} questions correct to pass. Try again!`)}
          </p>
          {testState.correctAnswers < totalQuestions && (
            <button
              onClick={handleRetryTest}
              disabled={retrying}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 mx-auto"
            >
              {retrying ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <RefreshCw size={16} />
              )}
              {isIndonesian ? 'Coba Lagi' : 'Retry Test'}
            </button>
          )}
        </div>
      </div>
    );
  }

  const currentQuestion = testState.questions[testState.currentQuestion];

  return (
    <div className="space-y-6 p-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          {isIndonesian 
            ? `Pertanyaan ${testState.currentQuestion + 1} dari ${totalQuestions}`
            : `Question ${testState.currentQuestion + 1} of ${totalQuestions}`}
        </h3>
        <div className="text-sm text-gray-600 dark:text-gray-300">
          {isIndonesian ? 'Benar:' : 'Correct:'} {testState.correctAnswers}
        </div>
      </div>

      <div className="border dark:border-gray-700 rounded-lg p-4">
        <p className="font-medium mb-6">{currentQuestion.question}</p>

        <div className="space-y-3">
          {currentQuestion.options.map((option, index) => (
            <button
              key={index}
              onClick={() => !showFeedback && setSelectedAnswer(index)}
              disabled={showFeedback}
              className={`w-full text-left p-3 rounded-lg border transition ${
                showFeedback
                  ? index === currentQuestion.correctIndex
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-500 dark:border-green-600'
                    : index === selectedAnswer
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-500 dark:border-red-600'
                    : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                  : selectedAnswer === index
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-600'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-600'
              }`}
            >
              <span className="inline-block w-6 text-center font-medium mr-2">
                {['A', 'B', 'C', 'D'][index]}.
              </span>
              {option}
            </button>
          ))}
        </div>

        {showFeedback && (
          <div className={`mt-4 p-4 rounded-lg ${isCorrect ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
            <p className="font-medium mb-2">
              {isCorrect 
                ? (isIndonesian ? 'Benar!' : 'Correct!') 
                : (isIndonesian ? 'Salah!' : 'Incorrect!')}
            </p>
            <p className="text-sm">{currentQuestion.explanation}</p>
          </div>
        )}

        <button
          onClick={handleAnswerSubmit}
          disabled={selectedAnswer === null || showFeedback}
          className="mt-6 w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          {isIndonesian ? 'Kirim Jawaban' : 'Submit Answer'}
        </button>
      </div>
    </div>
  );
}