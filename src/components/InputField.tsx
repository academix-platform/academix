import * as React from "react";
import { FieldError } from "react-hook-form";
import { Label, ErrorMessage } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

export type InputFieldProps = {
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
  const isRequired = inputProps?.required;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <Label htmlFor={inputId} required={isRequired}>
        {label}
      </Label>
      <Input
        id={inputId}
        type={type}
        error={Boolean(error)}
        aria-describedby={error?.message ? errorId : undefined}
        defaultValue={defaultValue}
        {...register(name)}
        {...inputProps}
      />
      {error?.message && (
        <ErrorMessage id={errorId}>
          {error.message.toString()}
        </ErrorMessage>
      )}
    </div>
  );
};

export default InputField;
