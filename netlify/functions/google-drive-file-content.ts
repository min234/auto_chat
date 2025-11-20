import { Handler } from '@netlify/functions';
import { google } from 'googleapis';

const handler: Handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const authHeader = event.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Not authenticated with Google Drive. Access token is missing.' }),
    };
  }

  // Create a temporary OAuth2 client with the user's token
  const tempOauth2Client = new google.auth.OAuth2();
  tempOauth2Client.setCredentials({ access_token: token });

  const drive = google.drive({ version: 'v3', auth: tempOauth2Client });
  const sheets = google.sheets({ version: 'v4', auth: tempOauth2Client });

  try {
    const { fileId, mimeType } = JSON.parse(event.body || '{}');

    let content: string[] = []; // Always return an array of strings
    if (mimeType === "application/vnd.google-apps.spreadsheet") {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: fileId,
        range: 'A1:Z1000', // Read a large range
      });
      // Map each row to a string, filter out empty rows
      content = response.data.values
        ?.map(row => row.join(', '))
        .filter(row => row.trim() !== '') ?? [];
    } else {
      const response = await drive.files.export({
        fileId: fileId,
        mimeType: 'text/plain',
      }, { responseType: 'text' });
      // Split by newline and filter out empty paragraphs
      content = (response.data as string)
        .split('\n')
        .filter(paragraph => paragraph.trim() !== '');
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    };
  } catch (error) {
    console.error('Error fetching Google Drive file content:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch file content from Google Drive.' }),
    };
  }
};

export { handler };
