import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addLocationSchema, confirmLocationSchema, type AddLocationFormData, type ConfirmLocationFormData } from "../validation/add-location.schema";
import { useCreateLocation, useUpdateLocation } from "@client/shared/services/api";
import { FormInput, FormSelect } from "@client/shared/components/forms";
import { SelectItem } from "@client/components/ui";
import { SubmitButton } from "@client/shared/components/ui";
import { MapPin, Check } from "lucide-react";
import { useState } from "react";

type Phase = "add" | "confirm";

export function AddLocation() {
  const [phase, setPhase] = useState<Phase>("add");
  const [createdLocation, setCreatedLocation] = useState<{ id: number; name: string; title: string } | null>(null);

  const { mutate: createLocation, isPending: isCreating, isSuccess: isCreated, error: createError } = useCreateLocation();
  const { mutate: updateLocation, isPending: isUpdating, error: updateError } = useUpdateLocation();

  const addForm = useForm<AddLocationFormData>({
    resolver: zodResolver(addLocationSchema),
    defaultValues: {
      name: "",
      address: "",
      category: "dining",
    },
  });

  const confirmForm = useForm<ConfirmLocationFormData>({
    resolver: zodResolver(confirmLocationSchema),
    defaultValues: {
      title: "",
    },
  });

  function handleAddLocation(data: AddLocationFormData) {
    createLocation(data, {
      onSuccess: (response) => {
        setCreatedLocation({
          id: response.id,
          name: response.source.name,
          title: response.title || response.source.name,
        });
        confirmForm.setValue("title", response.title || response.source.name);
        setPhase("confirm");
        addForm.reset();
      },
      onError: (error) => {
        console.error("Create location error:", error);
      },
    });
  }

  function handleConfirmTitle(data: ConfirmLocationFormData) {
    if (!createdLocation) return;

    updateLocation({
      id: createdLocation.id,
      data: { title: data.title }
    }, {
      onSuccess: () => {
        // Reset everything and go back to add phase
        setPhase("add");
        setCreatedLocation(null);
        confirmForm.reset();
      },
      onError: (error) => {
        console.error("Update location error:", error);
        // Show the error to the user
        alert(`Update failed: ${error.message}`);
      },
    });
  }

  function handleStartOver() {
    setPhase("add");
    setCreatedLocation(null);
    confirmForm.reset();
    addForm.reset();
  }

  if (phase === "confirm" && createdLocation) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div data-theme="light" className="w-full max-w-sm bg-background rounded-xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Header with icon and title */}
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
              <Check className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-[24px]! opacity-70 font-medium text-foreground">Confirm Location Title</h1>
          </div>

          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-700">
              ✓ Location "{createdLocation.name}" added successfully!
            </p>
          </div>

          <form onSubmit={confirmForm.handleSubmit(handleConfirmTitle)} className="space-y-4">
            <FormInput
              name="title"
              label="Display Title"
              control={confirmForm.control}
              placeholder="Clean display title"
              description={`Current: "${createdLocation.title}"`}
            />

            <div className="flex gap-2">
              <SubmitButton
                isLoading={isUpdating}
                submitText="Confirm Title"
                submittingText="Updating..."
                disabled={!confirmForm.formState.isValid}
                className="flex-1 h-10 mt-2 text-sm font-normal bg-primary text-primary-foreground hover:bg-primary/90"
              />

              <button
                type="button"
                onClick={handleStartOver}
                className="px-4 py-2 h-10 mt-2 text-sm font-normal border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md"
              >
                Add Another
              </button>
            </div>

            {updateError && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-600">
                Error: {updateError.message}
              </div>
            )}
          </form>
        </div>
      </div>
    );
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

        <form onSubmit={addForm.handleSubmit(handleAddLocation)} className="space-y-4">
          <FormInput
            name="name"
            label="Name"
            control={addForm.control}
            placeholder="Location Name"
          />

          <FormInput
            name="address"
            label="Address"
            control={addForm.control}
            placeholder="123 Main St, City, State, Country"
          />

          <FormSelect
            name="category"
            label="Category"
            control={addForm.control}
            placeholder="Select a category"
          >
            <SelectItem value="dining">Dining</SelectItem>
            <SelectItem value="accommodations">Accommodations</SelectItem>
            <SelectItem value="attractions">Attractions</SelectItem>
            <SelectItem value="nightlife">Nightlife</SelectItem>
          </FormSelect>

          <SubmitButton
            isLoading={isCreating}
            submitText="Add Location"
            submittingText="Adding Location..."
            disabled={!addForm.formState.isValid}
            className="w-full h-10 mt-2 text-sm font-normal bg-primary text-primary-foreground hover:bg-primary/90"
          />

          {createError && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-600">
              Error: {createError.message}
            </div>
          )}

          {isCreated && !createdLocation && (
            <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-600">
              Location added successfully!
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
