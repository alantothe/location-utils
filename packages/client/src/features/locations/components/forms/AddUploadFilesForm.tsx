import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormInput } from "@client/shared/components/forms";
import { Button } from "@client/components/ui/button";
import { useToast } from "@client/shared/hooks/useToast";
import { useAddUploadFiles } from "@client/shared/services/api/hooks/useAddUploadFiles";
import { ImagePreviewGrid } from "../ui/ImagePreviewGrid";
import { Upload } from "lucide-react";
import {
  addUploadFilesSchema,
  type AddUploadFilesFormData,
} from "../../validation/add-upload-files.schema";

interface AddUploadFilesFormProps {
  locationId: number;
}

export function AddUploadFilesForm({ locationId }: AddUploadFilesFormProps) {
  const { showToast } = useToast();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<AddUploadFilesFormData>({
    resolver: zodResolver(addUploadFilesSchema as any),
    defaultValues: {
      photographerCredit: "",
    },
  });

  const { mutate, isPending, uploadProgress } = useAddUploadFiles(locationId, {
    onSuccess: () => {
      const centerPosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      showToast(`${selectedFiles.length} image(s) uploaded successfully`, centerPosition);
      handleReset();
    },
    onError: (error) => {
      const centerPosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      showToast(error.message || "Failed to upload images", centerPosition);
    },
  });

  function handleFileSelect(files: FileList | null) {
    if (!files) return;
    const fileArray = Array.from(files);
    setSelectedFiles((prev) => [...prev, ...fileArray]);
  }

  function handleRemoveFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleReset() {
    setSelectedFiles([]);
    form.reset();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleSubmit(data: AddUploadFilesFormData) {
    if (selectedFiles.length === 0) return;
    mutate({
      files: selectedFiles,
      photographerCredit: data.photographerCredit || undefined,
    });
  }

  // Drag and drop handlers
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  }

  return (
    <div className="border rounded-lg p-4 bg-muted/50 space-y-3">
      <h4 className="text-sm font-semibold text-foreground">Add Images</h4>

      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
        {/* Drag and drop zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
          <p className="text-sm text-gray-600 mb-2">
            Drag and drop images here, or click to select
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isPending}
          >
            Choose Files
          </Button>
          <p className="text-xs text-gray-500 mt-2">
            {selectedFiles.length} file(s) selected
          </p>
        </div>

        {/* Image preview grid */}
        {selectedFiles.length > 0 && (
          <ImagePreviewGrid files={selectedFiles} onRemove={handleRemoveFile} />
        )}

        {/* Photographer credit */}
        <FormInput
          control={form.control}
          name="photographerCredit"
          label="Photographer Credit (optional)"
          placeholder="Name, studio, or publication"
        />

        {/* Progress bar */}
        {isPending && uploadProgress > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-600">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={isPending || selectedFiles.length === 0}
            size="sm"
          >
            {isPending ? `Uploading... ${uploadProgress}%` : "Upload Images"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={isPending}
            size="sm"
          >
            Clear
          </Button>
        </div>
      </form>
    </div>
  );
}
