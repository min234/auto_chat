import type { HandlerContext } from "@netlify/functions";
import { google } from 'googleapis';

export default async (request: Request, context: HandlerContext) => {
  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    // Dynamically construct the redirect URI using Netlify's environment variable
    const redirectUri = `${process.env.URL}/.netlify/functions/google-drive-auth-callback`;
    
    // --- DEBUGGING LOG ---
    console.log('[DEBUG] Netlify site URL (process.env.URL):', process.env.URL);
    console.log('[DEBUG] Constructed Redirect URI:', redirectUri);
    console.log('[DEBUG] Client ID from env:', process.env.GOOGLE_CLIENT_ID ? 'Loaded' : 'MISSING');

    // Create the OAuth2 client inside the handler with the dynamic redirect URI
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );

    const authorizeUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/spreadsheets.readonly'],
      prompt: 'consent',
    });

    // --- DEBUGGING LOG ---
    console.log('[DEBUG] Generated Authorize URL:', authorizeUrl);

    return new Response(JSON.stringify({ url: authorizeUrl }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in /netlify/functions/google-drive-auth-url:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate auth URL' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
