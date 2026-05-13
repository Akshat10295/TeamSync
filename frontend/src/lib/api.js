// Centralized API helper — uses Supabase session token
import { supabase } from './supabase';

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

export async function api(path, method = 'GET', body = null) {
  const token = await getToken();
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);

  try {
    const res = await fetch(path, opts);
    if (res.status === 401) {
      await supabase.auth.signOut();
      return null;
    }
    return res.json();
  } catch (err) {
    console.error('API fetch error:', err);
    return null;
  }
}

export async function apiUpload(path, formData) {
  const token = await getToken();
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    });
    if (res.status === 401) {
      await supabase.auth.signOut();
      return null;
    }
    return res.json();
  } catch (err) {
    console.error('API upload error:', err);
    return null;
  }
}

export async function apiDownload(path) {
  const token = await getToken();
  const res = await fetch(path, {
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Download failed');
  const disposition = res.headers.get('content-disposition');
  let filename = 'download';
  if (disposition) {
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match) filename = match[1];
  }
  const blob = await res.blob();
  return { blob, filename };
}
