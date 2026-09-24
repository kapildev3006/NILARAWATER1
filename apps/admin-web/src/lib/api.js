const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export async function fetchWithAuth(endpoint, options = {}) {
  // Can only access localStorage on the client side
  const token = typeof window !== 'undefined' 
    ? (localStorage.getItem('admin_auth_token') || localStorage.getItem('adminToken')) 
    : null;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If uploading form data, browser sets Content-Type automatically with boundaries
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (error) {
    console.error(`Fetch failed for URL: ${API_BASE}${endpoint}`, error);
    throw error;
  }

  const data = await response.json();
  
  if (!response.ok) {
    if ((response.status === 401 || response.status === 403) && typeof window !== 'undefined') {
      localStorage.removeItem('admin_auth_token');
      localStorage.removeItem('admin_user_data');
      localStorage.removeItem('adminToken');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    throw new Error(data.message || data.error?.message || 'API Request Failed');
  }

  return data;
}
