const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { ingredients = [] } = await req.json();

    const currentDate = new Date();
    const month = currentDate.toLocaleString('default', { month: 'long' });
    const season = getSeason(currentDate.getMonth());

    console.log("Generating recipe idea for:", { month, season, ingredients });

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are a culinary innovation expert for MY Baked Goods, a small-batch artisan bakery known for:
- Slow fermentation and traditional techniques
- Seasonal, locally-sourced ingredients
- Handmade breads and pastries
- Comfort-focused, rustic aesthetics
- Recipes inspired by family traditions and travels
- Weekend specials and rotating seasonal menu

Current season: ${season} (${month})
${ingredients.length > 0 ? `Available ingredients: ${ingredients.join(", ")}` : ""}

Generate 1 unique recipe idea that is:
1. Perfectly seasonal for ${month}
2. On-brand with MY Baked Goods' artisan, comfort-focused style
3. Marketable and different from typical bakery offerings
4. Practical for small-batch production
5. Featuring ingredients at their peak right now
${ingredients.length > 0 ? `6. Incorporates as many of the available ingredients as possible` : ""}

Provide a detailed recipe with exact measurements and clear instructions.`,
            },
            {
              role: "user",
              content: `Give me 1 seasonal baking idea for ${month} that would be perfect for MY Baked Goods${ingredients.length > 0 ? ` using these ingredients: ${ingredients.join(", ")}` : ""}. The idea should be unique, marketable, and include a complete recipe.

Return ONLY valid JSON in this exact format:
{
  "idea": {
    "name": "Recipe name",
    "description": "One-sentence description",
    "whySeasonable": "Why this is perfect for ${month} and what ingredients are at their peak",
    "marketDifferentiator": "What makes this unique and marketable compared to competitors",
    "recipe": {
      "ingredients": ["ingredient with measurement", "ingredient with measurement"],
      "instructions": ["Detailed step 1", "Detailed step 2"],
      "tips": ["Pro tip 1", "Pro tip 2"]
    }
  }
}`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "generate_recipe_idea",
                description: "Generate 1 seasonal recipe idea with complete details",
                parameters: {
                  type: "object",
                  properties: {
                    idea: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        description: { type: "string" },
                        whySeasonable: { type: "string" },
                        marketDifferentiator: { type: "string" },
                        recipe: {
                          type: "object",
                          properties: {
                            ingredients: {
                              type: "array",
                              items: { type: "string" },
                            },
                            instructions: {
                              type: "array",
                              items: { type: "string" },
                            },
                            tips: {
                              type: "array",
                              items: { type: "string" },
                            },
                          },
                          required: ["ingredients", "instructions", "tips"],
                        },
                      },
                      required: [
                        "name",
                        "description",
                        "whySeasonable",
                        "marketDifferentiator",
                        "recipe",
                      ],
                    },
                  },
                  required: ["idea"],
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "generate_recipe_idea" },
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response:", JSON.stringify(data, null, 2));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call in response");
    }

    const recipeIdeas = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(recipeIdeas), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in brainstorm-recipe function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function getSeason(month: number): string {
  if (month >= 2 && month <= 4) return "Spring";
  if (month >= 5 && month <= 7) return "Summer";
  if (month >= 8 && month <= 10) return "Fall";
  return "Winter";
}
