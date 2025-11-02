import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";

interface SceneInputProps {
  value: string;
  onChange: (value: string) => void;
}

export const SceneInput = ({ value, onChange }: SceneInputProps) => {
  return (
    <div className="space-y-3">
      <Label htmlFor="scene" className="text-base font-semibold flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        Describe your scene (optional)
      </Label>
      <Textarea
        id="scene"
        placeholder="e.g., 'rustic wooden table with natural lighting' or 'modern kitchen with marble countertop' or 'outdoor picnic setting'"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[100px] resize-none border-2 focus:border-primary"
      />
      <p className="text-xs text-muted-foreground">
        Leave empty for AI to choose the best background automatically
      </p>
    </div>
  );
};
