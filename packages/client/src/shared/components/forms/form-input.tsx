import * as React from "react";
import { type Control } from "react-hook-form";
import { Input } from "../ui/input";
import { FormBase } from "./form-base";

export interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  name: string;
  label: string;
  control: Control<any>;
  description?: string;
}

export function FormInput({
  name,
  label,
  control,
  description,
  ...inputProps
}: FormInputProps) {
  return (
    <FormBase
      name={name}
      label={label}
      control={control}
      description={description}
    >
      {(field, fieldState) => (
        <Input
          id={field.name}
          {...field}
          {...inputProps}
          aria-invalid={fieldState.invalid}
        />
      )}
    </FormBase>
  );
}
