import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addLocationSchema, type AddLocationFormData } from "../validation/add-location.schema";
import { useCreateLocation } from "@client/shared/services/api";
import { FormInput, FormSelect } from "@client/shared/components/forms";
import { SelectItem } from "@client/components/ui";
import { SubmitButton } from "@client/shared/components/ui";
import { MapPin } from "lucide-react";

export function AddLocation() {
  const { mutate, isPending, isSuccess, error } = useCreateLocation();

  const form = useForm<AddLocationFormData>({
    resolver: zodResolver(addLocationSchema),
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
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div data-theme="light" className="w-full max-w-sm bg-background rounded-xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header with icon and title */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
            <MapPin className="w-4 h-4 text-muted-foreground" />
          </div>
          <h1 className="text-[24px]! opacity-70 font-medium text-foreground">Add Location</h1>
        </div>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
            className="w-full h-10 mt-2 text-sm font-normal bg-primary text-primary-foreground hover:bg-primary/90"
          />

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-600">
              Error: {error.message}
            </div>
          )}

          {isSuccess && (
            <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-600">
              Location added successfully!
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
