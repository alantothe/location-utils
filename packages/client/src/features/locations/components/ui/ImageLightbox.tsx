import { Dialog, DialogContent } from "@client/components/ui/dialog";
import { Button } from "@client/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface ImageLightboxProps {
  images: string[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  photographerCredit?: string;
}

export function ImageLightbox({
  images,
  currentIndex,
  isOpen,
  onClose,
  onNext,
  onPrevious,
  photographerCredit,
}: ImageLightboxProps) {
  const currentImage = images[currentIndex];
  const imageUrl = `/api/images/${currentImage.replace(/^data\/images\//, '')}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 bg-black/95 border-0">
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-10 text-white hover:bg-white/20"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Navigation buttons */}
        {images.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
              onClick={onPrevious}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
              onClick={onNext}
              disabled={currentIndex === images.length - 1}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </>
        )}

        {/* Image */}
        <div className="relative">
          <img
            src={imageUrl}
            alt="Full size"
            className="w-full h-auto max-h-[90vh] object-contain"
          />

          {/* Image counter and credit */}
          <div className="absolute bottom-4 left-0 right-0 text-center text-white">
            <p className="text-sm">
              {currentIndex + 1} / {images.length}
            </p>
            {photographerCredit && (
              <p className="text-xs text-gray-300 mt-1">
                Photo by {photographerCredit}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
