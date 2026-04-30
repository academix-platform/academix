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
    <div className="flex flex-col gap-2 w-full md:w-1/3">
      <label className="text-gray-500 text-xs">{label}</label>
      <input
        type={type}
        {...register(name)}
        className="p-2 rounded-md ring-[1.5px] ring-gray-300 w-full text-sm"
        {...inputProps}
        defaultValue={defaultValue}
      />
      {error?.message && (
        <p className="text-red-400 text-xs">{error.message.toString()}</p>
      )}
    </div>
  );
};

export default InputField;
