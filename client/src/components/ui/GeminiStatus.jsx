/**
 * GeminiStatus.jsx — Development API connection tester widget.
 *
 * SECURITY:
 *  - Does NOT display or accept the API key.
 *  - Only shows status/latency returned by the server.
 *  - The "keyHint" (masked key) is only shown in dev mode server-side.
 *  - This component is safe to ship in production (no secrets).
 */
import { useState, useEffect } from 'react';
import { Sparkles, CheckCircle, XCircle, Loader2, AlertTriangle, RefreshCw, Clock } from 'lucide-react';
import { getGeminiStatus, testGeminiConn } from '../../services/api';
import Button from './Button';

const ERROR_MESSAGES = {
  GEMINI_MISSING_KEY:     'No API key configured. Add GEMINI_API_KEY to server/.env',
  GEMINI_INVALID_KEY:     'API key is invalid or revoked.',
  GEMINI_RATE_LIMIT:      'Rate limit hit. Wait a moment and retry.',
  GEMINI_QUOTA_EXCEEDED:  'Quota exceeded for this project.',
  GEMINI_TIMEOUT:         'Request timed out (30s). Check your connection.',
  GEMINI_INVALID_RESPONSE:'API returned an unexpected response format.',
  GEMINI_SERVICE_ERROR:   'Gemini service error. Try again shortly.',
  GEMINI_SAFETY_BLOCKED:  'Request blocked by safety filters.',
};

export default function GeminiStatus({ className = '' }) {
  const [status, setStatus]   = useState(null);   // { configured, model, keyHint? }
  const [testResult, setTest] = useState(null);   // { success, latencyMs } | { error }
  const [testing, setTesting] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Auto-fetch status on mount
  useEffect(() => {
    getGeminiStatus()
      .then((r) => setStatus(r.data))
      .catch(() => setStatus(null))
      .finally(() => setLoadingStatus(false));
  }, []);

  const handleTest = async () => {
    setTesting(true);
    setTest(null);
    try {
      const res = await testGeminiConn();
      setTest({ success: true, latencyMs: res.data.latencyMs, model: res.data.model });
    } catch (err) {
      const rawMsg = err.message || '';
      const knownCode = Object.keys(ERROR_MESSAGES).find((k) => rawMsg.includes(k));
      setTest({ success: false, error: knownCode ? ERROR_MESSAGES[knownCode] : rawMsg });
    } finally {
      setTesting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className={`rounded-2xl border bg-white shadow-card overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50">
        <div className="p-2 rounded-xl bg-brand-50 text-brand-600">
          <Sparkles size={16} />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Gemini API Connection</p>
          <p className="text-xs text-slate-500">Development test panel — not shown in production UI</p>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Status row */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-600">Key configured</span>
          {loadingStatus ? (
            <Loader2 size={14} className="animate-spin text-slate-400" />
          ) : status?.configured ? (
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
              <CheckCircle size={13} /> Yes
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-semibold text-red-500">
              <XCircle size={13} /> Missing
            </span>
          )}
        </div>

        {status?.model && (
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">Model</span>
            <code className="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono">{status.model}</code>
          </div>
        )}

        {/* Key hint (dev only — server strips this in production) */}
        {status?.keyHint && (
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">Key (masked)</span>
            <code className="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono text-slate-500">
              {status.keyHint}
            </code>
          </div>
        )}

        {/* Test result */}
        {testResult && (
          <div className={`rounded-xl px-3.5 py-3 text-xs flex items-start gap-2 ${
            testResult.success ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
          }`}>
            {testResult.success ? (
              <>
                <CheckCircle size={14} className="flex-shrink-0 mt-0.5" />
                <span>
                  Connected to <strong>{testResult.model}</strong>.{' '}
                  <span className="flex items-center gap-1 inline-flex">
                    <Clock size={11} /> {testResult.latencyMs}ms
                  </span>
                </span>
              </>
            ) : (
              <>
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                <span>{testResult.error}</span>
              </>
            )}
          </div>
        )}

        {/* Not configured warning */}
        {!loadingStatus && !status?.configured && (
          <div className="rounded-xl px-3.5 py-3 text-xs bg-amber-50 text-amber-800 flex items-start gap-2">
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
            <span>
              Add your Gemini API key to{' '}
              <code className="font-mono bg-amber-100 px-1 rounded">.env</code>:{' '}
              <code className="font-mono bg-amber-100 px-1 rounded">GEMINI_API_KEY=your_key_here</code>
            </span>
          </div>
        )}

        {/* Test button */}
        <Button
          onClick={handleTest}
          disabled={testing || loadingStatus || !status?.configured}
          loading={testing}
          size="sm"
          variant="outline"
          className="w-full"
        >
          {testing ? 'Testing connection…' : (
            <><RefreshCw size={13} /> Test Connection</>
          )}
        </Button>
      </div>
    </div>
  );
}
