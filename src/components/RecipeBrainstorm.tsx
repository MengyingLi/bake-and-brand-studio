import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Loader2, ChefHat, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { IngredientLibrary } from "./IngredientLibrary";

interface RecipeIdea {
  name: string;
  description: string;
  whySeasonable: string;
  marketDifferentiator: string;
  recipe: {
    ingredients: string[];
    instructions: string[];
    tips: string[];
  };
}

export const RecipeBrainstorm = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [recipeIdea, setRecipeIdea] = useState<RecipeIdea | null>(null);
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [currentIngredient, setCurrentIngredient] = useState("");
  const [draggedIngredient, setDraggedIngredient] = useState<string | null>(null);

  const handleAddIngredient = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && currentIngredient.trim()) {
      e.preventDefault();
      const newIngredient = currentIngredient.trim();
      if (!ingredients.includes(newIngredient)) {
        setIngredients([...ingredients, newIngredient]);
        toast.success(`Added ${newIngredient}`);
      }
      setCurrentIngredient("");
    }
  };

  const handleRemoveIngredient = (ingredient: string) => {
    setIngredients(ingredients.filter((i) => i !== ingredient));
  };

  const handleDragStart = (ingredient: string) => {
    setDraggedIngredient(ingredient);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedIngredient && !ingredients.includes(draggedIngredient)) {
      setIngredients([...ingredients, draggedIngredient]);
      toast.success(`Added ${draggedIngredient}`);
    }
    setDraggedIngredient(null);
  };

  const handleBrainstorm = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("brainstorm-recipe", {
        body: { ingredients },
      });

      if (error) {
        console.error("Edge function error:", error);
        throw error;
      }

      if (data?.idea) {
        setRecipeIdea(data.idea);
        toast.success("Recipe idea generated!");
      } else {
        throw new Error("No recipe idea returned");
      }
    } catch (error) {
      console.error("Brainstorm error:", error);
      toast.error("Failed to generate idea. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <div className="p-3 rounded-full bg-gradient-to-br from-primary to-accent">
            <Lightbulb className="h-8 w-8 text-white" />
          </div>
        </div>
        <h2 className="text-3xl font-bold">Brainstorm Your Next Bake</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Get seasonal, on-brand recipe ideas tailored to MY Baked Goods' artisan style
        </p>
      </div>

      <div className="grid md:grid-cols-[300px_1fr] gap-6 max-w-5xl mx-auto">
        {/* Ingredient Library - Left Side */}
        <div className="hidden md:block">
          <IngredientLibrary onDragStart={handleDragStart} />
        </div>

        {/* Main Area - Right Side */}
        <div className="space-y-4">
          {/* Mobile: Show ingredient library at top */}
          <div className="md:hidden mb-4">
            <IngredientLibrary onDragStart={handleDragStart} />
          </div>

          <Card
            className="border-2 border-dashed transition-colors hover:border-primary/50"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Your Selected Ingredients</CardTitle>
              <CardDescription className="text-xs">
                Drag from library or type to add custom ingredients
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2 min-h-[80px] p-3 bg-muted/30 rounded-md border">
                {ingredients.length > 0 ? (
                  ingredients.map((ingredient) => (
                    <Badge
                      key={ingredient}
                      variant="secondary"
                      className="text-sm py-1.5 px-3 flex items-center gap-2"
                    >
                      {ingredient}
                      <button
                        onClick={() => handleRemoveIngredient(ingredient)}
                        className="hover:text-destructive transition-colors"
                        type="button"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground italic">
                    Drag ingredients here or type below
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <label htmlFor="ingredients" className="text-xs font-medium text-muted-foreground">
                  Add custom ingredient
                </label>
                <Input
                  id="ingredients"
                  placeholder="Type ingredient and press Enter"
                  value={currentIngredient}
                  onChange={(e) => setCurrentIngredient(e.target.value)}
                  onKeyDown={handleAddIngredient}
                  className="text-sm"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center pt-2">
            <Button
              onClick={handleBrainstorm}
              disabled={isGenerating}
              size="lg"
              className="gap-2 text-lg py-6 px-8 shadow-lg hover:shadow-xl transition-all"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generating Recipe...
                </>
              ) : (
                <>
                  <ChefHat className="h-5 w-5" />
                  Get Recipe Idea
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {recipeIdea && (
        <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="overflow-hidden border-2 hover:border-primary transition-colors">
            <CardHeader className="bg-gradient-to-br from-primary/10 to-accent/10">
              <CardTitle className="text-2xl">{recipeIdea.name}</CardTitle>
              <CardDescription className="text-base">{recipeIdea.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <span className="text-primary">🌱</span> Why Now?
                </h4>
                <p className="text-muted-foreground">{recipeIdea.whySeasonable}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <span className="text-primary">✨</span> Market Edge
                </h4>
                <p className="text-muted-foreground">{recipeIdea.marketDifferentiator}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Ingredients</h4>
                <ul className="text-muted-foreground space-y-2">
                  {recipeIdea.recipe.ingredients.map((ingredient, i) => (
                    <li key={i}>• {ingredient}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Method</h4>
                <ol className="text-muted-foreground space-y-2">
                  {recipeIdea.recipe.instructions.map((step, i) => (
                    <li key={i}>{i + 1}. {step}</li>
                  ))}
                </ol>
              </div>

              {recipeIdea.recipe.tips.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Pro Tips</h4>
                  <ul className="text-muted-foreground space-y-2">
                    {recipeIdea.recipe.tips.map((tip, i) => (
                      <li key={i}>💡 {tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
};
