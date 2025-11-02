import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ImageGalleryProps {
  images: string[];
  isGenerating: boolean;
}

export const ImageGallery = ({ images, isGenerating }: ImageGalleryProps) => {
  const handleDownload = async (imageUrl: string, index: number) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `food-variant-${index + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  if (images.length === 0 && !isGenerating) {
    return null;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Generated Variants</h2>
      
      {isGenerating && (
        <Card className="p-12 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-primary/5 to-accent/5">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg font-medium text-muted-foreground">
            Creating your stunning variant...
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {images.map((image, index) => (
          <Card
            key={index}
            className="overflow-hidden group hover:shadow-lg transition-all duration-300"
          >
            <div className="aspect-square relative bg-muted">
              <img
                src={image}
                alt={`Variant ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300" />
            </div>
            <div className="p-4">
              <Button
                onClick={() => handleDownload(image, index)}
                className="w-full gap-2"
                variant="default"
              >
                <Download className="h-4 w-4" />
                Download PNG
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
