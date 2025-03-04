import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  baseURL: import.meta.env.VITE_OPENAI_API_URL || undefined,
  dangerouslyAllowBrowser: true
});

export async function getChatCompletion(messages: any[]) {
  try {
    console.log('Sending request to OpenAI...', messages);
    
    // Check if any message contains an image
    const hasImage = messages.some(msg => 
      Array.isArray(msg.content) && 
      msg.content.some((item: any) => item.type === 'image_url')
    );
    
    // Set a reasonable max_tokens limit to prevent overly long responses
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: hasImage 
            ? 'You are a helpful AI assistant that can analyze images and text. Provide clear, concise descriptions of images and answer questions about them.'
            : 'You are a helpful AI assistant specializing in education. Keep responses concise and focused.'
        },
        ...messages
      ],
      model: 'gpt-4o', // Use GPT-4o for all requests
      temperature: 0.7,
      max_tokens: 1000, // Increased token limit for more comprehensive responses
    });

    console.log('OpenAI response:', completion.choices[0].message);
    
    if (!completion.choices[0].message) {
      throw new Error('No response received from OpenAI');
    }

    return completion.choices[0].message;
  } catch (error) {
    console.error('Error in getChatCompletion:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('401')) {
        throw new Error('Invalid API key. Please check your OpenAI API configuration.');
      } else if (error.message.includes('429')) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      } else if (error.message.includes('500')) {
        throw new Error('OpenAI service error. Please try again later.');
      } else if (error.message.includes('timeout')) {
        throw new Error('Request timed out. The AI might be taking too long to respond.');
      } else if (error.message.includes('vision')) {
        throw new Error('Error processing image. Please try a different image or ask a text-only question.');
      }
    }
    
    throw error;
  }
}