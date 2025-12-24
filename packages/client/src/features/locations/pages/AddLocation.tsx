import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addLocationSchema, type AddLocationFormData } from "../validation/add-location.schema";
import { useCreateLocation } from "@client/shared/services/api";
import { FormInput, FormSelect } from "@client/shared/components/forms";
import { SelectItem } from "@client/components/ui";
import { SubmitButton } from "@client/shared/components/ui";

export function AddLocation() {
  const { mutate, isPending, isSuccess, error } = useCreateLocation();

  const form = useForm<AddLocationFormData>({
    resolver: zodResolver(addLocationSchema as any),
    defaultValues: {
      name: "",
      address: "",
      category: "dining",
    },
  });

  function handleSubmit(data: AddLocationFormData) {
    mutate(data, {
      onSuccess: () => {
        form.reset();
      },
    });
  }

  return (
    <div>
      <h1>Add Location</h1>
 
      <form onSubmit={form.handleSubmit(handleSubmit)} className="mt-8 max-w-2xl space-y-6">
        <FormInput
          name="name"
          label="Name"
          control={form.control}
          placeholder="Location Name"
        />

        <FormInput
          name="address"
          label="Address"
          control={form.control}
          placeholder="123 Main St, City, State, Country"
        />

        <FormSelect
          name="category"
          label="Category"
          control={form.control}
          placeholder="Select a category"
        >
          <SelectItem value="dining">Dining</SelectItem>
          <SelectItem value="accommodations">Accommodations</SelectItem>
          <SelectItem value="attractions">Attractions</SelectItem>
          <SelectItem value="nightlife">Nightlife</SelectItem>
        </FormSelect>

        <SubmitButton
          isLoading={isPending}
          submitText="Add Location"
          submittingText="Adding Location..."
          disabled={!form.formState.isValid}
          className="w-full sm:w-auto"
        />

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            Error: {error.message}
          </div>
        )}

        {isSuccess && (
          <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-500">
            Location added successfully!
          </div>
        )}
      </form>
    </div>
  );
}
