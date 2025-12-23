import * as React from "react";
import { type Control } from "react-hook-form";
import { Select, SelectTrigger, SelectValue, SelectContent } from "../ui/select";
import { FormBase } from "./form-base";

export interface FormSelectProps {
  name: string;
  label: string;
  control: Control<any>;
  children: React.ReactNode;
  placeholder?: string;
  description?: string;
}

export function FormSelect({
  name,
  label,
  control,
  children,
  placeholder,
  description,
}: FormSelectProps) {
  return (
    <FormBase
      name={name}
      label={label}
      control={control}
      description={description}
    >
      {(field, fieldState) => {
        const { onChange, onBlur, value, ref, ...fieldRest } = field;

        return (
          <Select
            {...fieldRest}
            value={value}
            onValueChange={onChange}
            aria-invalid={fieldState.invalid}
          >
            <SelectTrigger id={field.name} onBlur={onBlur} ref={ref}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {children}
            </SelectContent>
          </Select>
        );
      }}
    </FormBase>
  );
}
