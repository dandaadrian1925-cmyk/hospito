export default function MultiSelectPills({
  options,
  selected,
  onChange
}) {
  const toggle = value => {
    onChange(selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value]);
  };
  return <div className="flex flex-wrap gap-1.5">
      {options.map(opt => <button key={opt.value} type="button" onClick={() => toggle(opt.value)} className="px-2.5 py-1 rounded-full text-xs font-semibold transition-all" style={selected.includes(opt.value) ? {
      background: 'var(--blue)',
      color: 'white'
    } : {
      background: 'var(--bg-3)',
      color: 'var(--ink-2)'
    }}>
          {opt.label}
        </button>)}
    </div>;
}
