import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil } from "lucide-react";
import { editLocationSchema, type EditLocationFormData } from "../validation/edit-location.schema";
import { useLocationById, useUpdateLocation } from "@client/shared/services/api";
import { FormInput, FormSelect } from "@client/shared/components/forms";
import { SelectItem } from "@client/components/ui";
import { SubmitButton } from "@client/shared/components/ui";

export function EditLocation() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const locationId = id ? parseInt(id, 10) : null;

  const { data: location, isLoading, error: fetchError } = useLocationById(locationId);
  const { mutate, isPending, isSuccess, error: updateError } = useUpdateLocation();

  const form = useForm<EditLocationFormData>({
    resolver: zodResolver(editLocationSchema as any),
    defaultValues: {
      title: "",
      category: undefined,
      contactAddress: "",
      phoneNumber: "",
      website: "",
    },
  });

  // Pre-populate form when location data is loaded
  useEffect(() => {
    if (location) {
      form.reset({
        title: location.title || "",
        category: location.category,
        contactAddress: location.contact.contactAddress || "",
        phoneNumber: location.contact.phoneNumber || "",
        website: location.contact.website || "",
      });

      console.log("📦 Form reset complete. Category value:", form.getValues("category"));
    }
  }, [location, form]);

  // Redirect on successful update
  useEffect(() => {
    if (isSuccess) {
      navigate("/");
    }
  }, [isSuccess, navigate]);

  function handleSubmit(data: EditLocationFormData) {
    if (!locationId) return;

    // Only include fields that have values (since they're all optional)
    const updateData = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined && value !== "")
    );

    mutate({ id: locationId, data: updateData });
  }

  if (isLoading) {
    return <div>Loading location...</div>;
  }

  if (fetchError) {
    return (
      <div>
        <p style={{ color: "red" }}>Error loading location: {fetchError.message}</p>
        <button onClick={() => navigate("/")}>Back to locations</button>
      </div>
    );
  }

  if (!location) {
    return (
      <div>
        <p>Location not found</p>
        <button onClick={() => navigate("/")}>Back to locations</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background" data-theme="dark">
      <div className="w-full max-w-sm bg-background rounded-xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-500" data-theme="light">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
            <Pencil className="w-4 h-4 text-muted-foreground" />
          </div>
          <h1 className="text-[24px]! opacity-70 font-medium text-foreground">
            Edit Location
          </h1>
        </div>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormInput
          name="title"
          label="Title"
          control={form.control}
          placeholder="Location title (optional)"
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

        <FormInput
          name="contactAddress"
          label="Contact Address"
          control={form.control}
          placeholder="Contact address (optional)"
        />


        <FormInput
          name="phoneNumber"
          label="Phone Number"
          control={form.control}
          placeholder="Phone number (optional)"
        />

        <FormInput
          name="website"
          label="Website"
          control={form.control}
          placeholder="Website URL (optional)"
        />

        <div className="space-y-2 mt-6">
          <SubmitButton
            isLoading={isPending}
            submitText="Update Location"
            submittingText="Updating Location..."
            disabled={!form.formState.isDirty}
            className="w-full h-10 text-sm font-normal bg-primary text-primary-foreground hover:bg-primary/90"
          />
          <button
            type="button"
            onClick={() => navigate("/")}
            className="w-full h-10 text-sm font-normal bg-secondary text-secondary-foreground hover:bg-secondary/90 border border-border rounded-md"
          >
            Cancel
          </button>
        </div>

        {updateError && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-600">
            Error: {updateError.message}
          </div>
        )}

        {isSuccess && (
          <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-600">
            Location updated successfully! Redirecting...
          </div>
        )}
      </form>
      </div>
    </div>
  );
}
