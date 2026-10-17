export default function StatCard({ label, value, icon: Icon, colour = 'brand', trend, sub }) {
  const colours = {
    brand:   'bg-brand-50 text-brand-600',
    green:   'bg-emerald-50 text-emerald-600',
    amber:   'bg-amber-50 text-amber-600',
    blue:    'bg-blue-50 text-blue-600',
    purple:  'bg-purple-50 text-purple-600',
    red:     'bg-red-50 text-red-600',
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl ${colours[colour] ?? colours.brand}`}>
            <Icon size={20} />
          </div>
        )}
      </div>
      {trend && (
        <div className={`mt-3 flex items-center gap-1 text-xs font-medium ${trend > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          <span>{trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%</span>
          <span className="text-slate-400 font-normal">vs last week</span>
        </div>
      )}
    </div>
  );
}
