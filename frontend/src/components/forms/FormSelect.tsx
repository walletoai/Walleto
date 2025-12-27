type Option = {
  value: string;
  label: string;
};

type Props = {
  label: string;
  value: string;
  onChange: (next: string) => void;
  options: Option[];
};

export default function FormSelect({
  label,
  value,
  onChange,
  options,
}: Props) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-slate-300 font-medium">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-slate-100 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
