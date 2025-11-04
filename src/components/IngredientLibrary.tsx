import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Library } from "lucide-react";

const COMMON_INGREDIENTS = [
  "flour", "butter", "sugar", "eggs", "milk", "vanilla", "chocolate", "cream",
  "salt", "baking powder", "baking soda", "yeast", "honey", "cinnamon",
  "nuts", "berries", "lemon", "orange", "cocoa powder", "brown sugar",
  "almond flour", "cream cheese", "yogurt", "maple syrup", "oats"
];

interface IngredientLibraryProps {
  onDragStart: (ingredient: string) => void;
  selectedIngredients: string[];
}

export const IngredientLibrary = ({ onDragStart, selectedIngredients }: IngredientLibraryProps) => {
  const availableIngredients = COMMON_INGREDIENTS.filter(
    (ingredient) => !selectedIngredients.includes(ingredient)
  );
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Library className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Ingredient Library</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Drag ingredients into your list or type your own
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 max-h-[400px] overflow-y-auto">
          {availableIngredients.map((ingredient) => (
            <Badge
              key={ingredient}
              variant="outline"
              className="cursor-grab active:cursor-grabbing hover:bg-primary/10 transition-colors text-sm py-1.5 px-3"
              draggable
              onDragStart={() => onDragStart(ingredient)}
            >
              {ingredient}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
