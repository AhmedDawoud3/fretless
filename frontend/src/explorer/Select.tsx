type SelectProps<T extends string> = {
  label: string;
  value: T;
  options: readonly [T, string][];
  onChange: (value: T) => void;
};

export function Select<T extends string>({ label, value, options, onChange }: SelectProps<T>) {
  return (
    <label className="control">
      {label}
      <select
        value={value}
        onChange={(event) => {
          const chosen = options.find(([id]) => id === event.target.value);
          if (chosen) onChange(chosen[0]);
        }}
      >
        {options.map(([id, text]) => (
          <option key={id} value={id}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}
