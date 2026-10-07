export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://echorag-cm29.onrender.com').replace(/\/$/, '');

export function getFullAudioUrl(url) {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
    return url;
  }
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${API_BASE_URL}${cleanPath}`;
}
