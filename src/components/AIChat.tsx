import React, { useState, useRef, useEffect } from 'react';
import { Send, Download, Image, X, AlertCircle } from 'lucide-react';
import { getChatCompletion } from '../lib/openai';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { supabase } from '../lib/supabase';
import { ChatMessage } from '../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { useTheme } from '../context/ThemeContext';

interface AIChatProps {
  lectureId: string;
}

export function AIChat({ lectureId }: AIChatProps) {
  const { theme } = useTheme();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const chatContentRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (chatContentRef.current) {
      chatContentRef.current.scrollTop = chatContentRef.current.scrollHeight;
    }
  }, [messages]);

  // Load previous messages from localStorage
  useEffect(() => {
    try {
      const savedMessages = localStorage.getItem(`chat_${lectureId}`);
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      }
    } catch (error) {
      console.error('Error loading saved messages:', error);
    }
  }, [lectureId]);

  // Save messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      try {
        // Create a version of messages without full image data for storage
        const storageMessages = messages.map(msg => {
          if (msg.image) {
            // Just note that there was an image, but don't store the full data
            return {
              ...msg,
              image: '[Image data removed for storage]'
            };
          }
          return msg;
        });
        
        localStorage.setItem(`chat_${lectureId}`, JSON.stringify(storageMessages));
      } catch (error) {
        console.error('Error saving messages to localStorage:', error);
      }
    }
  }, [messages, lectureId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && !imageFile) || isLoading) return;

    const timestamp = new Date().toISOString();
    let userMessage: ChatMessage;

    if (imageFile && imagePreview) {
      // If there's an image, we need to include it in the message
      userMessage = { 
        role: 'user', 
        content: message.trim() ? message : "What's in this image?", 
        timestamp,
        image: imagePreview
      };
    } else {
      userMessage = { role: 'user', content: message, timestamp };
    }

    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setImageFile(null);
    setImagePreview(null);
    setIsLoading(true);
    setError(null);

    try {
      // Prepare messages for API call
      const apiMessages = [];
      
      // Add previous messages (without images for simplicity)
      for (const msg of messages.slice(-5)) { // Only use last 5 messages to avoid context length issues
        apiMessages.push({
          role: msg.role,
          content: msg.content
        });
      }

      // Add the current message
      if (userMessage.image) {
        // For image messages, we need to use the special format for OpenAI vision API
        apiMessages.push({
          role: 'user',
          content: [
            { type: 'text', text: userMessage.content },
            { 
              type: 'image_url', 
              image_url: { url: userMessage.image }
            }
          ]
        });
      } else {
        apiMessages.push({
          role: 'user',
          content: userMessage.content
        });
      }

      // Set a timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out after 45 seconds')), 45000);
      });

      // Race the API call with the timeout
      const response = await Promise.race([
        getChatCompletion(apiMessages),
        timeoutPromise
      ]) as any;

      if (response) {
        const assistantMessage = { 
          role: 'assistant',
          content: response.content || 'Sorry, I could not process your request.',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, assistantMessage]);

        // Save chat history to Supabase if user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          try {
            // Create a version of messages without full image data for storage
            const storageMessages = [...messages, userMessage, assistantMessage].map(msg => {
              if (msg.image) {
                // Just note that there was an image, but don't store the full data
                return {
                  ...msg,
                  image: '[Image data removed for storage]'
                };
              }
              return msg;
            });
            
            await supabase.from('chat_exports').insert({
              user_id: user.id,
              lecture_id: lectureId,
              messages: storageMessages
            });
          } catch (storageError) {
            console.error('Error saving chat history:', storageError);
            // Continue even if storage fails
          }
        }
      }
    } catch (error) {
      console.error('Error in chat:', error);
      setError('Sorry, there was an error processing your request. Please try again.');
      setMessages(prev => [...prev, { 
        role: 'assistant',
        content: 'Sorry, there was an error processing your request. Please try again with a shorter message or without an image.',
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (limit to 5MB to avoid issues)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size exceeds 5MB limit. Please choose a smaller image.');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPEG, PNG, etc.)');
      return;
    }

    setImageFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.onerror = () => {
      setError('Failed to read the image file. Please try another image.');
      setImageFile(null);
    };
    reader.readAsDataURL(file);
    
    setError(null);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const clearChat = () => {
    if (window.confirm('Are you sure you want to clear the chat history?')) {
      setMessages([]);
      localStorage.removeItem(`chat_${lectureId}`);
    }
  };

  const exportToPDF = async () => {
    if (!chatContentRef.current || messages.length === 0) return;
    
    try {
      setIsExporting(true);
      setError(null);
      
      // Create a new jsPDF instance
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Set title
      pdf.setFontSize(18);
      pdf.text('Chat History', 20, 20);
      pdf.setFontSize(12);
      pdf.text(`Exported on ${new Date().toLocaleString()}`, 20, 30);
      
      // Create a temporary div for PDF export - IMPORTANT: Define tempDiv here
      const tempDiv = document.createElement('div');
      tempDiv.style.padding = '20px';
      tempDiv.style.width = '700px';
      tempDiv.style.fontFamily = 'Arial, sans-serif';
      tempDiv.style.backgroundColor = 'white';
      
      // Add messages to the temp div
      for (const msg of messages) {
        const msgDiv = document.createElement('div');
        msgDiv.style.marginBottom = '20px';
        msgDiv.style.padding = '15px';
        msgDiv.style.borderRadius = '8px';
        msgDiv.style.backgroundColor = msg.role === 'user' ? '#f0f9ff' : '#f9fafb';
        msgDiv.style.border = '1px solid #e5e7eb';
        
        // Add role label
        const roleSpan = document.createElement('div');
        roleSpan.textContent = msg.role === 'user' ? 'You:' : 'AI Assistant:';
        roleSpan.style.fontWeight = 'bold';
        roleSpan.style.marginBottom = '8px';
        msgDiv.appendChild(roleSpan);
        
        // Add image if present
        if (msg.image && msg.image !== '[Image data removed for storage]') {
          const imgContainer = document.createElement('div');
          imgContainer.style.marginBottom = '10px';
          
          const img = document.createElement('img');
          img.src = msg.image;
          img.style.maxWidth = '100%';
          img.style.maxHeight = '200px';
          img.style.borderRadius = '4px';
          
          imgContainer.appendChild(img);
          msgDiv.appendChild(imgContainer);
        }
        
        // Add message content
        const contentDiv = document.createElement('div');
        contentDiv.textContent = msg.content;
        contentDiv.style.whiteSpace = 'pre-wrap';
        contentDiv.style.wordBreak = 'break-word';
        msgDiv.appendChild(contentDiv);
        
        // Add timestamp
        const timeDiv = document.createElement('div');
        timeDiv.textContent = new Date(msg.timestamp).toLocaleString();
        timeDiv.style.fontSize = '10px';
        timeDiv.style.color = '#6b7280';
        timeDiv.style.marginTop = '8px';
        timeDiv.style.textAlign = 'right';
        msgDiv.appendChild(timeDiv);
        
        tempDiv.appendChild(msgDiv);
      }
      
      // Append to document temporarily
      document.body.appendChild(tempDiv);
      
      try {
        // Convert to canvas and add to PDF
        const canvas = await html2canvas(tempDiv, {
          scale: 1.5,
          logging: false,
          useCORS: true,
          allowTaint: true
        });
        
        // Add the canvas to the PDF
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const imgWidth = 170; // A4 width minus margins
        const imgHeight = canvas.height * imgWidth / canvas.width;
        
        // Split into multiple pages if needed
        const pageHeight = 260; // A4 height minus margins
        let heightLeft = imgHeight;
        let position = 40; // Start position after title
        let page = 1;
        
        pdf.addImage(imgData, 'JPEG', 20, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - position;
        
        // Add new pages if content overflows
        while (heightLeft > 0) {
          position = 20; // Reset position for new pages
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 20, position - imgHeight + (pageHeight - position) * page, imgWidth, imgHeight);
          heightLeft -= pageHeight;
          page++;
        }
        
        // Save the PDF
        pdf.save(`chat-history-${new Date().toISOString().slice(0, 10)}.pdf`);
      } catch (canvasError) {
        console.error('Error creating canvas:', canvasError);
        
        // Fallback method if html2canvas fails with images
        let yPosition = 40;
        const pageHeight = 260;
        const lineHeight = 7;
        const margin = 20;
        const maxWidth = 170;
        
        for (const msg of messages) {
          // Check if we need a new page
          if (yPosition > pageHeight - 20) {
            pdf.addPage();
            yPosition = 20;
          }
          
          // Add role
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(12);
          pdf.text(msg.role === 'user' ? 'You:' : 'AI Assistant:', margin, yPosition);
          yPosition += lineHeight + 3;
          
          // Add content
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);
          
          // Split text into lines
          const textLines = pdf.splitTextToSize(msg.content, maxWidth);
          
          // Check if we need a new page for the content
          if (yPosition + textLines.length * lineHeight > pageHeight) {
            pdf.addPage();
            yPosition = 20;
          }
          
          pdf.text(textLines, margin, yPosition);
          yPosition += textLines.length * lineHeight + 5;
          
          // Add timestamp
          pdf.setFontSize(8);
          pdf.setTextColor(100, 100, 100);
          pdf.text(new Date(msg.timestamp).toLocaleString(), margin, yPosition);
          pdf.setTextColor(0, 0, 0);
          
          yPosition += lineHeight + 10;
        }
        
        // Save the PDF (fallback method)
        pdf.save(`chat-history-simple-${new Date().toISOString().slice(0, 10)}.pdf`);
      }
      
      // Remove the temporary div - IMPORTANT: Make sure to remove it
      document.body.removeChild(tempDiv);
      
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      setError('Failed to export chat history. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg flex flex-col h-full transition-colors duration-200">
      <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">AI Assistant</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">Ask questions about the lecture content</p>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600"
              title="Clear chat history"
            >
              <X size={18} />
            </button>
          )}
          <button
            onClick={exportToPDF}
            disabled={isExporting || messages.length === 0}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 disabled:text-gray-400 dark:disabled:text-gray-600 transition-colors p-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30 flex items-center gap-1"
            title="Download chat history as PDF"
          >
            {isExporting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 dark:border-blue-400 border-t-transparent" />
            ) : (
              <Download size={18} />
            )}
            <span className="text-sm hidden sm:inline">Export PDF</span>
          </button>
        </div>
      </div>

      <div 
        id="chat-content" 
        ref={chatContentRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <p>No messages yet. Start a conversation!</p>
            <p className="text-sm mt-2">You can also upload images to ask about them.</p>
          </div>
        )}
        
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[90%] p-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100'
              }`}
            >
              {msg.image && msg.image !== '[Image data removed for storage]' && (
                <div className="mb-2">
                  <img 
                    src={msg.image} 
                    alt="User uploaded" 
                    className="max-w-full rounded-lg max-h-48 object-contain"
                  />
                </div>
              )}
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
                className="markdown-content break-words"
              >
                {msg.content}
              </ReactMarkdown>
              <div className={`text-xs mt-2 ${msg.role === 'user' ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'}`}>
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 p-3 rounded-lg">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/30 border-t border-red-100 dark:border-red-800">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        </div>
      )}

      {imagePreview && (
        <div className="px-4 py-2 border-t dark:border-gray-700">
          <div className="relative inline-block">
            <img 
              src={imagePreview} 
              alt="Preview" 
              className="h-20 rounded-lg object-contain"
            />
            <button
              onClick={removeImage}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
              title="Remove image"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-4 border-t dark:border-gray-700">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:text-gray-400 dark:disabled:text-gray-600 disabled:hover:bg-transparent"
            title="Upload an image"
          >
            <Image size={20} />
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
              disabled={isLoading}
            />
          </button>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask anything..."
            disabled={isLoading}
            className="flex-1 p-2 border dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
          <button
            type="submit"
            disabled={isLoading || (!message.trim() && !imageFile)}
            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 dark:disabled:bg-blue-500/50 transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
      </form>

      {/* Hidden div for PDF content */}
      <div ref={pdfContentRef} className="hidden"></div>
    </div>
  );
}