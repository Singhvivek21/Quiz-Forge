import { useState } from 'react';
import { Moon, Sun, Save, Check } from 'lucide-react';
import Card from '../components/ui/Card';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import GeminiStatus from '../components/ui/GeminiStatus';
import { useApp } from '../context/AppContext';

function SettingsSection({ title, description, children }) {
  return (
    <Card className="space-y-5">
      <div className="pb-4 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
      {children}
    </Card>
  );
}

function SettingsRow({ label, description, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800">{label}</p>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
      <div className="sm:w-48 flex-shrink-0">{children}</div>
    </div>
  );
}

export default function Settings() {
  const { state, dispatch } = useApp();
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // Future: persist to localStorage or server
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="page-container max-w-3xl space-y-6">
      <div>
        <h1 className="section-title">Settings</h1>
        <p className="section-subtitle">Personalise your AI QuizForge experience.</p>
      </div>

      {/* Appearance */}
      <SettingsSection title="Appearance" description="Control how the app looks and feels.">
        <SettingsRow
          label="Theme"
          description="Choose between light and dark interface."
        >
          <div className="flex gap-2">
            {[
              { value: 'light', icon: Sun, label: 'Light' },
              { value: 'dark', icon: Moon, label: 'Dark' },
            ].map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                onClick={() => dispatch({ type: 'SET_THEME', payload: value })}
                aria-pressed={state.theme === value}
                className={[
                  'flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all',
                  state.theme === value
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300',
                ].join(' ')}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </div>
        </SettingsRow>
      </SettingsSection>

      {/* Language */}
      <SettingsSection title="Language & Localisation" description="Set your preferred display language.">
        <SettingsRow label="Interface Language" description="Language used throughout the app.">
          <Select
            value={state.language}
            onChange={(e) => dispatch({ type: 'SET_LANGUAGE', payload: e.target.value })}
          >
            {['English', 'Hindi', 'Spanish', 'French', 'German', 'Arabic'].map((l) => (
              <option key={l}>{l}</option>
            ))}
          </Select>
        </SettingsRow>
      </SettingsSection>

      {/* Quiz defaults */}
      <SettingsSection
        title="Quiz Defaults"
        description="These values will be pre-filled when you create a new quiz."
      >
        <SettingsRow label="Default Difficulty" description="Starting difficulty for new quizzes.">
          <Select
            value={state.defaultDifficulty}
            onChange={(e) => dispatch({ type: 'SET_DEFAULT_DIFFICULTY', payload: e.target.value })}
          >
            {['Easy', 'Medium', 'Hard', 'Mixed'].map((d) => (
              <option key={d} value={d.toLowerCase()}>{d}</option>
            ))}
          </Select>
        </SettingsRow>

        <SettingsRow label="Default Question Count" description="How many questions to generate by default.">
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="5" max="50" step="5"
              value={state.defaultQuestionCount}
              onChange={(e) => dispatch({ type: 'SET_DEFAULT_QUESTION_COUNT', payload: Number(e.target.value) })}
              className="flex-1 accent-brand-600"
            />
            <span className="w-10 text-center text-sm font-semibold text-brand-600 bg-brand-50 rounded-lg py-1">
              {state.defaultQuestionCount}
            </span>
          </div>
        </SettingsRow>
      </SettingsSection>

      {/* Gemini API Connection */}
      <SettingsSection
        title="Gemini API Connection"
        description="Your API key lives exclusively in the server .env file. It is never sent to the browser."
      >
        <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-600 mb-4">
          Add your key to{' '}
          <code className="font-mono text-xs bg-slate-200 px-1.5 py-0.5 rounded">server/.env</code>:{' '}
          <code className="font-mono text-xs bg-slate-200 px-1.5 py-0.5 rounded">GEMINI_API_KEY=your_key_here</code>.
          Never paste your key into this form — it would be bundled into the browser.
        </div>
        <GeminiStatus />
      </SettingsSection>

      {/* Save button */}
      <div className="flex justify-end gap-3">
        <Button variant={saved ? 'secondary' : 'primary'} onClick={handleSave}>
          {saved ? <><Check size={16} /> Saved!</> : <><Save size={16} /> Save Changes</>}
        </Button>
      </div>
    </div>
  );
}
