import { Handler } from '@netlify/functions';
import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const handler: Handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const authorizeUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/spreadsheets.readonly'],
      prompt: 'consent',
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: authorizeUrl }),
    };
  } catch (error) {
    console.error('Error in /netlify/functions/google-drive-auth-url:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate auth URL' }),
    };
  }
};

export { handler };
