import { X } from "lucide-react";
import { Button } from "@client/components/ui/button";

interface ImagePreviewGridProps {
  files: File[];
  onRemove: (index: number) => void;
}

export function ImagePreviewGrid({ files, onRemove }: ImagePreviewGridProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {files.map((file, index) => {
        const previewUrl = URL.createObjectURL(file);
        return (
          <div key={index} className="relative group">
            <img
              src={previewUrl}
              alt={file.name}
              className="w-full h-30 object-cover rounded"
              onLoad={() => URL.revokeObjectURL(previewUrl)}
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onRemove(index)}
            >
              <X className="h-3 w-3" />
            </Button>
            <p className="text-xs truncate mt-1">{file.name}</p>
          </div>
        );
      })}
    </div>
  );
}
