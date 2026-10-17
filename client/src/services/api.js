/**
 * api.js — typed HTTP client for the AI QuizForge backend.
 * All requests go to /api/v1/* which Vite proxies to Express on port 3001.
 *
 * SECURITY: The Gemini API key is NEVER imported or referenced here.
 * All AI calls are proxied through the server — the browser only sees /api/v1/*.
 */

const BASE = '/api/v1';

async function request(method, path, body, extraHeaders = {}) {
  let userRole = 'student';
  try {
    userRole = localStorage.getItem('qf_user_role') || 'student';
  } catch (e) {
    // ignore
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-user-role': userRole,
      ...extraHeaders,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));

  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    if (data.code) err.code = data.code;
    throw err;
  }

  return data;
}

// ── Quizzes endpoints ──────────────────────────────────────────────────────
export const getQuizzes   = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request('GET', `/quizzes${query ? `?${query}` : ''}`);
};
export const getQuiz      = (id)   => request('GET',    `/quizzes/${id}`);
export const saveQuiz     = (body) => request('POST',   '/quizzes/save', body);
export const createQuiz   = (body) => request('POST',   '/quizzes', body);
export const deleteQuiz   = (id)   => request('DELETE', `/quizzes/${id}`);

// ── Attempts endpoints ─────────────────────────────────────────────────────
export const saveAttempt  = (body) => request('POST',   '/attempts', body);
export const getAttempts  = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request('GET', `/attempts${query ? `?${query}` : ''}`);
};
export const getAttempt   = (id)   => request('GET',    `/attempts/${id}`);

// ── Progress & Stats endpoints ─────────────────────────────────────────────
export const getProgress     = () => request('GET', '/progress');
export const getWeakConcepts = (limit = 5) => request('GET', `/progress/weak?limit=${limit}`);
export const getStats        = () => request('GET', '/stats');

// ── Teacher Mode endpoints ─────────────────────────────────────────────────
export const getTeacherDashboard     = () => request('GET', '/teacher/dashboard');
export const getTeacherQuizzes       = () => request('GET', '/teacher/quizzes');
export const getTeacherQuizAnalytics = (id) => request('GET', `/teacher/quizzes/${id}/analytics`);
export const updateTeacherQuiz       = (id, body) => request('PUT', `/teacher/quizzes/${id}`, body);
export const shareTeacherQuiz        = (id, isShared) => request('POST', `/teacher/quizzes/${id}/share`, { isShared });
export const deleteTeacherQuiz       = (id) => request('DELETE', `/teacher/quizzes/${id}`);

// ── Shared Quiz endpoints (Student Play) ───────────────────────────────────
export const getSharedQuiz           = (shareCode) => request('GET', `/shared/${shareCode}`);
export const submitSharedAttempt     = (shareCode, body) => request('POST', `/shared/${shareCode}/attempt`, body);

// ── Gemini endpoints (all server-proxied — API key never touches browser) ──
export const getGeminiStatus      = ()     => request('GET',  '/gemini/status');
export const testGeminiConn       = ()     => request('POST', '/gemini/test');
export const generateQuiz         = (body) => request('POST', '/gemini/generate', body);
export const generateAdaptiveQuiz = (body) => request('POST', '/gemini/adaptive', body);
export const analyzePerformance   = (body) => request('POST', '/gemini/analyze', body);

// ── Document Extraction ────────────────────────────────────────────────────
export const extractDocumentText = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${BASE}/gemini/extract-text`, {
    method: 'POST',
    body: formData,
  });

  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    if (data.code) err.code = data.code;
    throw err;
  }
  return data;
};

// ── Health ─────────────────────────────────────────────────────────────────
export const healthCheck = () => fetch('/health').then((r) => r.json());
