import { useState } from 'react';
import {
  Share2, Copy, Check, ExternalLink, ShieldCheck,
  AlertCircle, Lock, Globe, Sparkles, X
} from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import Badge from './Badge';
import { shareTeacherQuiz } from '../../services/api';

export default function ShareModal({
  isOpen,
  onClose,
  quiz,
  onShareUpdated
}) {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!quiz) return null;

  const isShared = Boolean(quiz.is_shared || quiz.isShared);
  const shareCode = quiz.share_code || quiz.shareCode || '';
  const shareUrl = shareCode
    ? `${window.location.origin}/share/${shareCode}`
    : '';

  const handleToggleShare = async () => {
    setLoading(true);
    setError(null);
    try {
      const newStatus = !isShared;
      const res = await shareTeacherQuiz(quiz.id, newStatus);
      if (res && res.data) {
        if (onShareUpdated) {
          onShareUpdated(quiz.id, res.data.isShared, res.data.shareCode);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to update quiz share status');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share Quiz with Students"
      size="md"
    >
      <div className="space-y-5">
        {/* Quiz brief summary */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Selected Quiz</p>
          <h3 className="text-base font-bold text-slate-900 mt-0.5">{quiz.title}</h3>
          <div className="flex items-center gap-2 mt-2 text-xs text-slate-600">
            <Badge variant="secondary">{quiz.subject}</Badge>
            <span>•</span>
            <span>{quiz.questions?.length || quiz.question_count || 0} Questions</span>
            <span>•</span>
            <span className="capitalize">{quiz.difficulty || 'Medium'}</span>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertCircle size={15} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Sharing status toggle */}
        <div className="flex items-center justify-between p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isShared ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
              {isShared ? <Globe size={20} /> : <Lock size={20} />}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">
                {isShared ? 'Public Student Access is Active' : 'Quiz is Currently Private'}
              </p>
              <p className="text-xs text-slate-500">
                {isShared
                  ? 'Students can access and take this quiz with the link or code.'
                  : 'Only you can view and edit this quiz.'}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant={isShared ? 'secondary' : 'primary'}
            onClick={handleToggleShare}
            loading={loading}
          >
            {isShared ? 'Disable Sharing' : 'Publish & Share'}
          </Button>
        </div>

        {/* Share details if active */}
        {isShared && shareCode && (
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Classroom Share Code
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 font-mono text-base font-bold text-brand-700 bg-brand-50/60 border border-brand-200 px-3.5 py-2 rounded-xl text-center tracking-widest select-all">
                  {shareCode}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Direct Student Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 text-xs text-slate-700 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 font-mono select-all focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <Button
                  size="sm"
                  variant={copied ? 'success' : 'primary'}
                  onClick={handleCopy}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                </Button>
              </div>
            </div>

            {/* Privacy Safeguard Guarantee notice */}
            <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl flex items-start gap-2.5">
              <ShieldCheck size={16} className="text-indigo-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-indigo-900 leading-relaxed">
                <span className="font-bold">Student Privacy Protected:</span> Student attempts are tracked with safe display names or anonymous IDs. No personal emails or sensitive accounts are exposed.
              </div>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
