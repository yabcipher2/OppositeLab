/**
 * API Client for both Web and Mobile
 * 
 * For Web: Uses relative paths /api/...
 * For Mobile: Uses deployed URL from NEXT_PUBLIC_API_URL
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

/**
 * Make an API request that works in both web and mobile environments
 */
export async function apiRequest(
  endpoint: string,
  options?: RequestInit
): Promise<Response> {
  const url = API_BASE ? `${API_BASE}${endpoint}` : endpoint;
  
  return fetch(url, {
    ...options,
    credentials: API_BASE ? 'include' : options?.credentials,
  });
}

/**
 * Helper for JSON API requests
 */
export async function apiJson<T = any>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await apiRequest(endpoint, options);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || `API Error: ${response.statusText}`);
  }
  
  return data;
}
