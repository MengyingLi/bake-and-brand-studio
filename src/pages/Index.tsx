import { useState } from "react";
import { ImageUpload } from "@/components/ImageUpload";
import { SceneInput } from "@/components/SceneInput";
import { ImageGallery } from "@/components/ImageGallery";
import { Button } from "@/components/ui/button";
import { Wand2, ChefHat } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [sceneDescription, setSceneDescription] = useState("");
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleClearImage = () => {
    setSelectedImage(null);
  };

  const handleGenerate = async () => {
    if (!selectedImage) {
      toast.error("Please upload a product image first");
      return;
    }

    setIsGenerating(true);
    
    try {
      // Convert image to base64
      const reader = new FileReader();
      reader.readAsDataURL(selectedImage);
      
      reader.onload = async () => {
        const base64Image = reader.result as string;
        
        const { data, error } = await supabase.functions.invoke("generate-food-variant", {
          body: {
            image: base64Image,
            sceneDescription: sceneDescription || "professional food photography background",
          },
        });

        if (error) throw error;

        if (data?.imageUrl) {
          setGeneratedImages((prev) => [...prev, data.imageUrl]);
          toast.success("Variant generated successfully!");
        }
      };

      reader.onerror = () => {
        throw new Error("Failed to read image file");
      };
    } catch (error) {
      console.error("Generation error:", error);
      toast.error("Failed to generate variant. Please try again.");
    } finally {
      setIsGenerating(false);
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
              onImageSelect={setSelectedImage}
              selectedImage={selectedImage}
              onClear={handleClearImage}
            />

            {selectedImage && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <SceneInput
                  value={sceneDescription}
                  onChange={setSceneDescription}
                />

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
