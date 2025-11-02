import { useState, useCallback } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  selectedImage: File | null;
  onClear: () => void;
}

export const ImageUpload = ({ onImageSelect, selectedImage, onClear }: ImageUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files && files[0]) {
        if (files[0].type.startsWith("image/")) {
          onImageSelect(files[0]);
        }
      }
    },
    [onImageSelect]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      onImageSelect(files[0]);
    }
  };

  return (
    <div className="w-full">
      {selectedImage ? (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-card border-2 border-border">
          <img
            src={URL.createObjectURL(selectedImage)}
            alt="Selected product"
            className="w-full h-full object-contain"
          />
          <Button
            onClick={onClear}
            size="icon"
            variant="destructive"
            className="absolute top-4 right-4"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={cn(
            "relative w-full aspect-video rounded-xl border-2 border-dashed transition-all cursor-pointer",
            isDragging
              ? "border-primary bg-primary/5 scale-[1.02]"
              : "border-border hover:border-primary/50 hover:bg-muted/50"
          )}
        >
          <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer gap-4">
            <div className="p-6 rounded-full bg-gradient-to-br from-primary/10 to-accent/10">
              <Upload className="h-12 w-12 text-primary" />
            </div>
            <div className="text-center space-y-2 px-6">
              <p className="text-lg font-semibold text-foreground">
                Upload your product image
              </p>
              <p className="text-sm text-muted-foreground">
                Drag and drop or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                PNG, JPG or WEBP (background-removed recommended)
              </p>
            </div>
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleFileInput}
            />
          </label>
        </div>
      )}
    </div>
  );
};
