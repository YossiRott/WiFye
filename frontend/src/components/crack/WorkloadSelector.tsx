import type { Workload } from '../../api/types';

const OPTIONS: { value: Workload; label: string; hint: string }[] = [
  { value: '1', label: 'Low', hint: 'Background' },
  { value: '2', label: 'Medium', hint: 'Balanced' },
  { value: '3', label: 'High', hint: 'Recommended' },
  { value: '4', label: 'Max', hint: 'May freeze UI' },
];

interface WorkloadSelectorProps {
  value: Workload;
  onChange: (value: Workload) => void;
}

export function WorkloadSelector({ value, onChange }: WorkloadSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {OPTIONS.map((opt) => (
        <label
          key={opt.value}
          className={`cursor-pointer rounded-lg border p-2 text-center text-xs transition-colors ${
            value === opt.value ? 'border-primary bg-primary/10 text-primary' : 'border-border text-text-muted hover:border-primary/40'
          }`}
        >
          <input
            type="radio"
            name="workload"
            className="hidden"
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
          />
          <div className="font-semibold">{opt.label}</div>
          <div className="text-[10px] opacity-80">{opt.hint}</div>
        </label>
      ))}
    </div>
  );
}
