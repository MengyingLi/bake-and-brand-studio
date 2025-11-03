import { useState } from "react";
import { ImageUpload } from "@/components/ImageUpload";
import { SceneInput } from "@/components/SceneInput";
import { ImageGallery } from "@/components/ImageGallery";
import { Button } from "@/components/ui/button";
import { Wand2, ChefHat } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logGenerationEvent, logUserInteraction } from "@/lib/braintrust";

const Index = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [sceneDescription, setSceneDescription] = useState("");
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<"analyzing" | "generating" | null>(null);

  const handleImageSelect = async (file: File) => {
    setSelectedImage(file);
    // Log image upload
    await logUserInteraction("upload_image", {
      imageSize: file.size,
    });
  };

  const handleClearImage = async () => {
    setSelectedImage(null);
    // Log clear action
    await logUserInteraction("clear_image");
  };

  const handleGenerate = async () => {
    if (!selectedImage) {
      toast.error("Please upload a product image first");
      return;
    }

    setIsGenerating(true);
    setGenerationStep("analyzing");
    
    try {
      // Create canvas to convert image to proper format
      const img = new Image();
      const objectUrl = URL.createObjectURL(selectedImage);
      
      img.onload = async () => {
        URL.revokeObjectURL(objectUrl);
        
        // Create canvas to ensure proper format
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error("Failed to create canvas context");
        }
        
        // Resize if too large (max 1920px)
        const maxSize = 1920;
        let width = img.width;
        let height = img.height;
        
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize;
            width = maxSize;
          } else {
            width = (width / height) * maxSize;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to PNG base64
        const base64Image = canvas.toDataURL('image/png');
        
        // Log start of generation (after image conversion, matching halloween agent pattern)
        await logGenerationEvent("start", {
          image: base64Image,
          sceneDescription: sceneDescription || undefined,
        });
        
        // Simulate step transition for better UX
        setTimeout(() => {
          setGenerationStep("generating");
        }, 3000);
        
        const { data, error } = await supabase.functions.invoke("generate-food-variant", {
          body: {
            image: base64Image,
            sceneDescription: sceneDescription || "professional food photography background",
          },
        });

        if (error) {
          console.error("Edge function error:", error);
          throw error;
        }

        if (data?.imageUrl) {
          setGeneratedImages((prev) => [...prev, data.imageUrl]);
          toast.success("Variant generated successfully!");
          
          // Log successful completion (matching halloween agent pattern)
          await logGenerationEvent("complete", {
            image: base64Image,
            sceneDescription: sceneDescription || undefined,
            success: true,
          });
        } else {
          throw new Error("No image URL returned");
        }
        
        setIsGenerating(false);
        setGenerationStep(null);
      };
      
      img.onerror = async () => {
        URL.revokeObjectURL(objectUrl);
        toast.error("Failed to load image file");
        setIsGenerating(false);
        setGenerationStep(null);
        
        // Log error (matching halloween agent pattern)
        await logGenerationEvent("error", {
          error: "Failed to load image file",
        });
      };
      
      img.src = objectUrl;
    } catch (error) {
      console.error("Generation error:", error);
      toast.error("Failed to generate variant. Please try again.");
      setIsGenerating(false);
      setGenerationStep(null);
      
      // Log error (matching halloween agent pattern)
      await logGenerationEvent("error", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/30">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
              <ChefHat className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Food Variant Studio
              </h1>
              <p className="text-sm text-muted-foreground">
                AI-powered product photography backgrounds
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="space-y-12">
          {/* Upload Section */}
          <section className="space-y-6">
            <ImageUpload
              onImageSelect={handleImageSelect}
              selectedImage={selectedImage}
              onClear={handleClearImage}
            />

            {selectedImage && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <SceneInput
                  value={sceneDescription}
                  onChange={setSceneDescription}
                />

                <div className="space-y-4">
                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    size="lg"
                    className="w-full md:w-auto gap-2 text-lg py-6 px-8 shadow-lg hover:shadow-xl transition-all"
                  >
                    {isGenerating ? (
                      <>
                        <Wand2 className="h-5 w-5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-5 w-5" />
                        Generate Variant
                      </>
                    )}
                  </Button>
                  
                  {generationStep && (
                    <div className="text-sm text-muted-foreground animate-pulse">
                      {generationStep === "analyzing" && "⚡ Step 1/2: Analyzing product image..."}
                      {generationStep === "generating" && "✨ Step 2/2: Generating new background..."}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Gallery Section */}
          <ImageGallery images={generatedImages} isGenerating={isGenerating} />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/50 backdrop-blur-sm mt-24">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>Transform your food products with AI-powered backgrounds</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
