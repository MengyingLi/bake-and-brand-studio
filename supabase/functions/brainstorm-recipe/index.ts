// Import Braintrust SDK for Deno (lazy, to avoid hard failure if unavailable)
let braintrust: any = null;
try {
  braintrust = await import("https://esm.sh/braintrust@0.4.8");
  console.log("✅ Braintrust SDK imported successfully (brainstorm-recipe)");
} catch (e) {
  console.log("ℹ️ Braintrust SDK not available (brainstorm-recipe)");
}

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
    const startTime = Date.now();
    // Initialize Braintrust logger
    let logger;
    const BRAINTRUST_API_KEY = Deno.env.get("BRAINTRUST_API_KEY");
    console.info("[Braintrust] SDK available:", !!braintrust, "| API key set:", !!BRAINTRUST_API_KEY);
    if (braintrust && BRAINTRUST_API_KEY) {
      try {
        logger = braintrust.initLogger({
          projectName: "Bake-and-Brand-Studio",
          apiKey: BRAINTRUST_API_KEY,
          asyncFlush: false,
        });
        console.info("[Braintrust] Logger initialized successfully");
      } catch (e) {
        console.error("[Braintrust] Failed to init logger:", e);
      }
    } else {
      console.info("[Braintrust] Skipping - SDK or API key missing");
    }
    
    return await (logger ? braintrust.traced(async (rootSpan: any) => {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        throw new Error("LOVABLE_API_KEY is not configured");
      }

      const { ingredients = [] } = await req.json();

      const currentDate = new Date();
      const month = currentDate.toLocaleString('default', { month: 'long' });
      const season = getSeason(currentDate.getMonth());

      console.log("Generating recipe idea for:", { month, season, ingredients });

      // Build prompts
      const { systemContent, userContent } = await rootSpan.traced(async (span: any) => {
        span.log({ step: "build_prompts", month, season, ingredientsCount: ingredients.length });
        
        const systemContent = `You are a culinary innovation expert for MY Baked Goods, a small-batch artisan bakery known for:
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

Provide a detailed recipe with exact measurements and clear instructions.`;

        const userContent = `Give me 1 seasonal baking idea for ${month} that would be perfect for MY Baked Goods${
          ingredients.length > 0 ? ` using these ingredients: ${ingredients.join(", ")}` : ""
        }. The idea should be unique, marketable, and include a complete recipe.

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
}`;

        return { systemContent, userContent };
      }, { name: "build_prompts" });

      // Populate root span Input/Metadata for trace table visibility
      try {
        await rootSpan.log({
          input: {
            userPrompt: userContent,
            month,
            season,
            ingredients,
          },
          metadata: {
            systemPrompt: systemContent,
            environment: "supabase-edge",
            timestamp: new Date().toISOString(),
            schemaVersion: "v2",
          },
        });
      } catch (_) {}

      // Log start event
      if (logger) {
        try {
          console.info("[Braintrust] Sending start event...");
          await logger.log({
            event: "brainstorm_recipe",
            type: "start",
            input: {
              month,
              season,
              ingredients,
            },
            metadata: {
              environment: "supabase-edge",
              timestamp: new Date().toISOString(),
              systemPrompt: systemContent,
              userPrompt: userContent,
            },
          });
          console.info("[Braintrust] Start event sent successfully");
        } catch (e) {
          console.error("[Braintrust] Failed to send start event:", e);
        }
      }

      // AI Gateway call
      const response = await rootSpan.traced(async (span: any) => {
        span.log({ step: "ai_gateway_call", model: "google/gemini-2.5-flash" });
        
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
                  content: systemContent,
                },
                {
                  role: "user",
                  content: userContent,
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

        span.log({ status: response.status });
        return response;
      }, { name: "ai_gateway_call" });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI Gateway error:", response.status, errorText);
        throw new Error(`AI Gateway error: ${response.status}`);
      }

      // Parse tool call
      const recipeIdeas = await rootSpan.traced(async (span: any) => {
        span.log({ step: "parse_tool_call" });
        const data = await response.json();
        console.log("AI response:", JSON.stringify(data, null, 2));

        const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
        span.log({ hasToolCall: !!toolCall });
        
        if (!toolCall) {
          throw new Error("No tool call in response");
        }

        const recipeIdeas = JSON.parse(toolCall.function.arguments);
        span.log({ ideaName: recipeIdeas?.idea?.name ?? null });
        return recipeIdeas;
      }, { name: "parse_tool_call" });

      // Log Output on root span for trace table visibility
      try {
        const preview = `${recipeIdeas?.idea?.name ?? "(no name)"}: ${
          recipeIdeas?.idea?.description ?? ""
        }`;
        await rootSpan.log({
          output: {
            preview,
            recipeJson: JSON.stringify(recipeIdeas),
          },
          metadata: {
            duration: Date.now() - startTime,
          },
        });
      } catch (_) {}

      return new Response(JSON.stringify(recipeIdeas), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }, { name: "request" }) : (async () => {
      // Fallback when logger not available - execute without tracing
      const { ingredients = [] } = await req.json();
      const currentDate = new Date();
      const month = currentDate.toLocaleString('default', { month: 'long' });
      const season = getSeason(currentDate.getMonth());

      const systemContent = `You are a culinary innovation expert for MY Baked Goods...`;
      const userContent = `Give me 1 seasonal baking idea for ${month}...`;

      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemContent },
            { role: "user", content: userContent },
          ],
          tools: [/* same tool definition */],
          tool_choice: { type: "function", function: { name: "generate_recipe_idea" } },
        }),
      });

      if (!response.ok) throw new Error(`AI Gateway error: ${response.status}`);
      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) throw new Error("No tool call in response");
      const recipeIdeas = JSON.parse(toolCall.function.arguments);

      return new Response(JSON.stringify(recipeIdeas), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    })());
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
