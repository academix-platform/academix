import { FieldError } from "react-hook-form";

type InputFieldProps = {
  label: string;
  type?: string;
  register: any;
  name: string;
  defaultValue?: string;
  error?: FieldError;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
};

const InputField = ({
  label,
  type = "text",
  register,
  name,
  defaultValue,
  error,
  inputProps,
}: InputFieldProps) => {
  const inputId = inputProps?.id || `input-${name}`;
  const errorId = `${inputId}-error`;

  return (
    <div className="flex flex-col gap-2 w-full">
      <label htmlFor={inputId} className="font-medium text-gray-700 text-sm">
        {label}
      </label>
      <input
        id={inputId}
        type={type}
        {...register(name)}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error?.message ? errorId : undefined}
        className="focus:bg-academixPurpleLight px-4 py-3 border-2 border-gray-200 focus:border-academixPurpleDark rounded-lg focus:outline-none focus:ring-2 focus:ring-academixPurpleDark/20 text-sm transition-all placeholder-gray-400"
        {...inputProps}
        defaultValue={defaultValue}
      />
      {error?.message && (
        <p id={errorId} role="alert" className="font-medium text-red-500 text-xs">
          {error.message.toString()}
        </p>
      )}
    </div>
  );
};

export default InputField;
