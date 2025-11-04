import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Loader2, ChefHat, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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

  const handleAddIngredient = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && currentIngredient.trim()) {
      e.preventDefault();
      if (!ingredients.includes(currentIngredient.trim())) {
        setIngredients([...ingredients, currentIngredient.trim()]);
      }
      setCurrentIngredient("");
    }
  };

  const handleRemoveIngredient = (ingredient: string) => {
    setIngredients(ingredients.filter((i) => i !== ingredient));
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

      <div className="max-w-2xl mx-auto space-y-4">
        <div className="space-y-2">
          <label htmlFor="ingredients" className="text-sm font-medium">
            What ingredients do you have?
          </label>
          <Input
            id="ingredients"
            placeholder="Type an ingredient and press Enter"
            value={currentIngredient}
            onChange={(e) => setCurrentIngredient(e.target.value)}
            onKeyDown={handleAddIngredient}
            className="text-base"
          />
          {ingredients.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {ingredients.map((ingredient) => (
                <Badge
                  key={ingredient}
                  variant="secondary"
                  className="text-sm py-1 px-3 gap-1"
                >
                  {ingredient}
                  <button
                    onClick={() => handleRemoveIngredient(ingredient)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-center">
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
