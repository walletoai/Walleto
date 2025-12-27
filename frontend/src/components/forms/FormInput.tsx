import { type InputHTMLAttributes } from "react";

type Props = {
  label: string;
  value: string | number;
  onChange: (next: string) => void;
  helpText?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">;

export default function FormInput({
  label,
  value,
  onChange,
  helpText,
  className = "",
  ...rest
}: Props) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-slate-300 font-medium">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-slate-100 placeholder-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${className}`}
        {...rest}
      />
      {helpText && (
        <span className="text-xs text-slate-500">{helpText}</span>
      )}
    </label>
  );
}
