/**
 * API Configuration utility

 * API requests are routed through the Next.js proxy to ensure
 * credentials are not exposed to the client browser.
 */

export const API_CONFIG = {

  // Proxy path
  PROXY_PATH: '/api/proxy',
};

/**
 * Converts a direct API URL to use the Next.js proxy
 * SECURITY: Always routes through proxy to keep credentials server-side
 * @param url The original API URL
 * @param baseUrl The base URL for the API (optional for env-driven config)
 * @returns The proxied URL (always uses proxy for security)
 */
export function getProxiedUrl(url: string, baseUrl: string): string {
  // SECURITY: Always route through proxy to ensure credentials are never sent from client
  // This prevents credentials from being visible in browser DevTools or network tab
  
  // For environment-driven config, baseUrl may be empty (credentials are server-side)
  // Extract path from URL
  let path: string;
  if (!baseUrl || baseUrl === '') {
    // When baseUrl is empty, URL is already a path (e.g., "/api/v2/users/me")
    // Just remove leading slash if present
    path = url.replace(/^\//, '');
  } else {
    // Remove the base URL from the full URL to get the path
    path = url.replace(baseUrl, '').replace(/^\//, '');
  }
  
  // Always return the proxied URL for security
  return `${API_CONFIG.PROXY_PATH}/${path}`;
}

/**
 * Gets headers for API requests
 * SECURITY: Credentials are NEVER sent from client browser
 * They are always retrieved server-side from environment variables or secure cookies
 * @param baseUrl The base API URL (only used as metadata, not for routing)
 * @param ejentoAccessToken The access token (not used - kept for backward compatibility)
 * @param apiKey The API subscription key (not used - kept for backward compatibility)
 * @returns Headers object (never includes credentials)
 */
export function getApiHeaders(
  baseUrl: string,
  ejentoAccessToken: string,
  apiKey: string
): Record<string, string> {

  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };


  return headers;
}

