import { Handler } from '@netlify/functions';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.GPT40_API_KEY,
});

const handler: Handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { messages, model: modelName, response_format } = JSON.parse(event.body || '{}');

    if (!messages) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Messages are required' }),
      };
    }

    const chatCompletion = await openai.chat.completions.create({
      model: modelName || "gpt-4o-mini",
      messages: messages,
      response_format: response_format,
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chatCompletion),
    };
  } catch (error) {
    console.error('Error in /netlify/functions/chat-completions:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to get completion' }),
    };
  }
};

export { handler };
