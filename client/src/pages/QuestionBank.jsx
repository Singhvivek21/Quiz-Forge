import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Plus, Library } from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { EmptyState } from '../components/ui/Feedback';

const QUESTIONS = [
  { id: 'q1', body: 'What is the powerhouse of the cell?', type: 'mcq', subject: 'Biology', topic: 'Cell Biology', difficulty: 'Easy', options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Golgi apparatus'], answer: 'Mitochondria' },
  { id: 'q2', body: 'Solve: 2x² − 5x + 3 = 0. What are the roots?', type: 'mcq', subject: 'Mathematics', topic: 'Algebra', difficulty: 'Medium', options: ['x=1, x=1.5', 'x=2, x=3', 'x=0, x=5', 'x=−1, x=3'], answer: 'x=1, x=1.5' },
  { id: 'q3', body: 'Python lists are mutable.', type: 'true_false', subject: 'CS', topic: 'Python', difficulty: 'Easy', options: ['True', 'False'], answer: 'True' },
  { id: 'q4', body: 'What year did World War II end?', type: 'short_answer', subject: 'History', topic: 'Modern History', difficulty: 'Easy', options: [], answer: '1945' },
  { id: 'q5', body: 'State Newton\'s Second Law of Motion.', type: 'short_answer', subject: 'Physics', topic: 'Mechanics', difficulty: 'Medium', options: [], answer: 'F = ma' },
];

const typeLabel = { mcq: 'MCQ', true_false: 'True/False', short_answer: 'Short Answer' };
const typeColour = { mcq: 'brand', true_false: 'blue', short_answer: 'purple' };
const diffColour = { Easy: 'green', Medium: 'yellow', Hard: 'red' };

export default function QuestionBank() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState('All');

  const subjects = ['All', ...new Set(QUESTIONS.map((q) => q.subject))];

  const filtered = QUESTIONS.filter((q) => {
    const matchQuery = q.body.toLowerCase().includes(query.toLowerCase()) || q.topic.toLowerCase().includes(query.toLowerCase());
    const matchSubject = subject === 'All' || q.subject === subject;
    return matchQuery && matchSubject;
  });

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="section-title">Question Bank</h1>
          <p className="section-subtitle">{QUESTIONS.length} curated questions across science, mathematics, and history</p>
        </div>
        <Button onClick={() => navigate('/create')}>
          <Plus size={16} />
          Create New Question via AI
        </Button>
      </div>

      {/* Search & filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            icon={Search}
            placeholder="Search questions…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="sm:w-44"
        >
          {subjects.map((s) => <option key={s}>{s}</option>)}
        </Select>
        <Button variant="secondary">
          <Filter size={16} />
          More Filters
        </Button>
      </div>

      {/* Results count */}
      <p className="text-xs text-slate-500">{filtered.length} of {QUESTIONS.length} questions</p>

      {/* Question list */}
      {filtered.length === 0 ? (
        <EmptyState icon={Library} title="No questions found" description="Try a different search or add a new question." />
      ) : (
        <div className="space-y-3">
          {filtered.map((q) => (
            <Card key={q.id} hover className="group">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 leading-relaxed">{q.body}</p>
                  {q.options.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {q.options.map((opt) => (
                        <span
                          key={opt}
                          className={`text-xs px-2.5 py-1 rounded-lg border ${opt === q.answer ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-medium' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                        >
                          {opt === q.answer && '✓ '}{opt}
                        </span>
                      ))}
                    </div>
                  )}
                  {q.type === 'short_answer' && (
                    <p className="mt-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1 inline-block">
                      Answer: {q.answer}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge colour={typeColour[q.type]}>{typeLabel[q.type]}</Badge>
                    <Badge colour={diffColour[q.difficulty] ?? 'default'}>{q.difficulty}</Badge>
                    <Badge colour="default">{q.subject}</Badge>
                    <Badge colour="default">{q.topic}</Badge>
                  </div>
                </div>
                <button className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 flex-shrink-0">
                  <Filter size={14} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
