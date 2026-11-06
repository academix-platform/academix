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
  return (
    <div className="flex flex-col gap-2 w-full">
      <label className="font-medium text-gray-700 text-sm">{label}</label>
      <input
        type={type}
        {...register(name)}
        className="focus:bg-academixPurpleLight px-4 py-3 border-2 border-gray-200 focus:border-academixPurpleDark rounded-lg focus:outline-none focus:ring-0 text-sm transition-all placeholder-gray-400"
        {...inputProps}
        defaultValue={defaultValue}
      />
      {error?.message && (
        <p className="font-medium text-red-500 text-xs">
          {error.message.toString()}
        </p>
      )}
    </div>
  );
};

export default InputField;

