import { loadScript } from '../utils';

const API_BASE_URL = '/.netlify/functions'; // Backend URL

let _googleApiKey: string | null = null;
let _googleClientId: string | null = null;

// Function to fetch Google API Key and Client ID from backend
const fetchGoogleApiConfig = async () => {
  if (_googleApiKey && _googleClientId) return; // Already fetched

  try {
    const response = await fetch(`${API_BASE_URL}/google-config`);
    if (!response.ok) {
      throw new Error('Failed to fetch Google API config from backend.');
    }
    const config = await response.json();
    _googleApiKey = config.apiKey;
    _googleClientId = config.clientId;

    if (!_googleApiKey || !_googleClientId) {
      console.warn("Google API Key or Client ID not received from backend.");
    }
  } catch (error) {
    console.error("Failed to fetch Google API config from backend:", error);
  }
};


/**
 * Initializes the Google API and GIS clients.
 * Now primarily loads the scripts for global `gapi` and `google.accounts.oauth2` objects.
 */
export const initGoogleClients = async () => {
  await loadScript("https://apis.google.com/js/api.js", () => {
    // gapi.load('client', () => {}); // No direct client init on frontend
  });
  await loadScript("https://accounts.google.com/gsi/client", () => {}); // No direct GIS init on frontend
  await fetchGoogleApiConfig(); // Fetch public config if needed
};

/**
 *  Initiates the Google OAuth flow by redirecting to the backend.
 */
export const handleAuthClick = async (): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/google-drive-auth-url`);
    if (!response.ok) {
      throw new Error('Failed to get Google auth URL from backend.');
    }
    const { url } = await response.json();
    window.open(url, '_blank'); // Open auth URL in a new tab
    // The callback will handle setting tokens in the backend session
  } catch (error) {
    console.error("Error initiating Google auth:", error);
    throw error;
  }
};

/**
 *  Sign out the user by revoking the token on the backend.
 */
export const handleSignoutClick = async () => {
  try {
    // Implement a backend endpoint to revoke token and clear session
    // For now, just clear local state if any
    console.log("Google token revoked (frontend-side indication).");
  } catch (error) {
    console.error("Error signing out from Google:", error);
  }
};

/**
 * Shows the Google Picker API.
 * @param accessToken The Google OAuth access token.
 */
export const showPicker = (accessToken: string): Promise<any> => {
    return new Promise(async (resolve, reject) => {
      if (!window.gapi) {
        return reject("GAPI script not loaded. Call initGoogleClients() first.");
    }
        if (!window.google || !window.google.picker) {
            // Attempt to load picker API if not already loaded
            await new Promise<void>(res => window.gapi.load('picker', res));
            if (!window.google || !window.google.picker) {
                return reject("Google Picker API not loaded after attempt.");
            }
        }

        if (!_googleApiKey || !_googleClientId) {
          return reject("Google API Key or Client ID not available for Picker.");
        }

        if (!accessToken) {
            return reject("No access token provided for Google Picker. Please authenticate.");
        }

        const view = new window.google.picker.View(window.google.picker.ViewId.DOCS);
        view.setMimeTypes("application/vnd.google-apps.document,application/vnd.google-apps.spreadsheet");

        const picker = new window.google.picker.PickerBuilder()
            .setAppId(_googleClientId)
            .setOAuthToken(accessToken)
            .addView(view)
            .setDeveloperKey(_googleApiKey)
            .setCallback((data: any) => {
                if (data.action === window.google.picker.Action.PICKED) {
                    resolve(data.docs);
                } else if (data.action === window.google.picker.Action.CANCEL) {
                    reject('Picker cancelled');
                }
            })
            .build();
        picker.setVisible(true);
    });
};

/**
 * Fetches the content of a Google Drive file.
 * @param fileId The ID of the file to fetch.
 * @param mimeType The MIME type of the file.
 * @param accessToken The Google OAuth access token.
 */
export const getFileContent = async (fileId: string, mimeType: string, accessToken: string): Promise<string[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/google-drive-file-content`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ fileId, mimeType }),
        });

        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(`Failed to get file content from backend: ${errorBody.error || response.statusText}`);
        }

        const { content } = await response.json();
        return content;
    } catch (error) {
        console.error("Error fetching file content via backend:", error);
        throw error;
    }
};
