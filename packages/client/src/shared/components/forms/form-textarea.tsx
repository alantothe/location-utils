import * as React from "react";
import { type Control } from "react-hook-form";
import { Textarea } from "@client/components/ui";
import { FormBase } from "./form-base";

export interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  name: string;
  label: string;
  control: Control<any>;
  description?: string;
  onPaste?: (event: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  onInput?: (event: React.FormEvent<HTMLTextAreaElement>) => void;
}

export function FormTextarea({
  name,
  label,
  control,
  description,
  onPaste,
  onInput,
  ...textareaProps
}: FormTextareaProps) {
  return (
    <FormBase
      name={name}
      label={label}
      control={control}
      description={description}
    >
      {(field, fieldState) => (
        <Textarea
          id={field.name}
          {...field}
          {...textareaProps}
          onPaste={onPaste}
          onInput={onInput}
          aria-invalid={fieldState.invalid}
        />
      )}
    </FormBase>
  );
}

