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

  console.log('[/netlify/functions/google-drive-auth-callback] Received callback from Google.');
  const code = event.queryStringParameters?.code;

  if (!code) {
    return {
      statusCode: 400,
      body: 'Missing authorization code.',
    };
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    console.log('[/netlify/functions/google-drive-auth-callback] Successfully exchanged code for tokens.');

    // Send tokens to the client via postMessage
    // The targetOrigin needs to be dynamic based on the Netlify deployment URL
    const targetOrigin = process.env.NETLIFY_SITE_URL || 'http://localhost:3000';

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html' },
      body: `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authentication Success</title>
        </head>
        <body>
          <script>
            window.opener.postMessage({
              type: 'google-auth-tokens',
              tokens: ${JSON.stringify(tokens)}
            }, '${targetOrigin}');
            window.close();
          </script>
          <p>Authentication successful! You can close this window.</p>
        </body>
        </html>
      `,
    };
  } catch (error) {
    console.error('Error during Google OAuth callback:', error);
    return {
      statusCode: 500,
      body: 'Authentication failed.',
    };
  }
};

export { handler };
