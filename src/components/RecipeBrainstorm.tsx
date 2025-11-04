import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, Loader2, ChefHat } from "lucide-react";
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
  const [recipeIdeas, setRecipeIdeas] = useState<RecipeIdea[]>([]);

  const handleBrainstorm = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("brainstorm-recipe", {
        body: {},
      });

      if (error) {
        console.error("Edge function error:", error);
        throw error;
      }

      if (data?.ideas) {
        setRecipeIdeas(data.ideas);
        toast.success("Recipe ideas generated!");
      } else {
        throw new Error("No recipe ideas returned");
      }
    } catch (error) {
      console.error("Brainstorm error:", error);
      toast.error("Failed to generate ideas. Please try again.");
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
              Generating Ideas...
            </>
          ) : (
            <>
              <ChefHat className="h-5 w-5" />
              Get Recipe Ideas
            </>
          )}
        </Button>
      </div>

      {recipeIdeas.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {recipeIdeas.map((idea, index) => (
            <Card key={index} className="overflow-hidden border-2 hover:border-primary transition-colors">
              <CardHeader className="bg-gradient-to-br from-primary/10 to-accent/10">
                <CardTitle className="text-xl">{idea.name}</CardTitle>
                <CardDescription className="text-sm">{idea.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <span className="text-primary">🌱</span> Why Now?
                  </h4>
                  <p className="text-sm text-muted-foreground">{idea.whySeasonable}</p>
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <span className="text-primary">✨</span> Market Edge
                  </h4>
                  <p className="text-sm text-muted-foreground">{idea.marketDifferentiator}</p>
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-2">Ingredients</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {idea.recipe.ingredients.slice(0, 5).map((ingredient, i) => (
                      <li key={i}>• {ingredient}</li>
                    ))}
                    {idea.recipe.ingredients.length > 5 && (
                      <li className="italic">+ {idea.recipe.ingredients.length - 5} more...</li>
                    )}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-2">Method</h4>
                  <ol className="text-sm text-muted-foreground space-y-1">
                    {idea.recipe.instructions.slice(0, 3).map((step, i) => (
                      <li key={i}>{i + 1}. {step}</li>
                    ))}
                    {idea.recipe.instructions.length > 3 && (
                      <li className="italic">+ {idea.recipe.instructions.length - 3} more steps...</li>
                    )}
                  </ol>
                </div>

                {idea.recipe.tips.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Pro Tips</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {idea.recipe.tips.map((tip, i) => (
                        <li key={i}>💡 {tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
};
