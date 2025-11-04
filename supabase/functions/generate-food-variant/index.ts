import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Import Braintrust SDK for Deno (lazy, to avoid hard failure if unavailable)
let braintrust: any = null;
try {
  braintrust = await import("https://esm.sh/braintrust@0.4.8");
  console.log("✅ Braintrust SDK imported successfully (generate-food-variant)");
} catch (e) {
  console.log("ℹ️ Braintrust SDK not available (generate-food-variant)");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
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
      const { image, sceneDescription } = await req.json();
      
      if (!image) {
        return new Response(
          JSON.stringify({ error: "Image is required" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Validate image is a data URL
      if (!image.startsWith('data:image/')) {
        console.error("Invalid image format received");
        return new Response(
          JSON.stringify({ error: "Image must be a data URL (data:image/...)" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      const OPENAI_API_KEY = Deno.env.get("OPENAI_KEY");
      if (!OPENAI_API_KEY) {
        throw new Error("OPENAI_KEY is not configured");
      }

      // Log request input
      rootSpan.log({
        input: {
          image,
          sceneDescription,
        },
        metadata: {
          environment: "supabase-edge",
          timestamp: new Date().toISOString(),
        },
      });

      console.log("Step 1: Analyzing product image...");

      // Vision analyze
      const productDescription = await rootSpan.traced(async (span: any) => {
        span.log({ step: "vision_analyze", model: "gpt-4o-mini" });

        const analysisResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Briefly describe this food: type, colors, and plating (max 50 words).",
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: image,
                    },
                  },
                ],
              },
            ],
            max_tokens: 100,
          }),
        });

        const analysisText = await analysisResponse.text();
        console.log("Analysis response status:", analysisResponse.status);
        console.log("Analysis response body:", analysisText);

        span.log({ status: analysisResponse.status });

        if (!analysisResponse.ok) {
          return new Response(
            JSON.stringify({ error: `Analysis failed: ${analysisResponse.status} - ${analysisText}` }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
          );
        }

        let analysisData;
        try {
          analysisData = JSON.parse(analysisText);
        } catch (e) {
          console.error("Failed to parse analysis response:", e);
          return new Response(
            JSON.stringify({ error: "Invalid response from OpenAI" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
          );
        }

        const productDescription = analysisData.choices?.[0]?.message?.content;

        if (!productDescription) {
          console.error("No product description in response:", analysisText);
          return new Response(
            JSON.stringify({ error: "Failed to analyze product image - no description returned" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
          );
        }
        
        return productDescription;
      }, { name: "vision_analyze" });

      console.log("Step 2: Generating new image with scene:", sceneDescription);

      // Compose generation prompt
      const fullPrompt = await rootSpan.traced(async (span: any) => {
        span.log({ step: "compose_generation_prompt", hasProductDescription: !!productDescription });
        
        const backgroundPrompt = sceneDescription || "professional food photography background, clean and appetizing";
        const fullPrompt = `Professional food photography: ${productDescription}. Setting: ${backgroundPrompt}. High-quality, appetizing presentation, marketing-ready image.`;
        
        return fullPrompt;
      }, { name: "compose_generation_prompt" });

      // Image generate
      const generatedImage = await rootSpan.traced(async (span: any) => {
        span.log({ step: "image_generate", model: "gpt-image-1", size: "1024x1024" });

        const generateResponse = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-image-1",
            prompt: fullPrompt,
            n: 1,
            size: "1024x1024",
            quality: "high",
            output_format: "png",
          }),
        });

        span.log({ status: generateResponse.status });

        if (!generateResponse.ok) {
          const errorText = await generateResponse.text();
          console.error("OpenAI generation error:", generateResponse.status, errorText);
          throw new Error(`Failed to generate image: ${generateResponse.status}`);
        }

        const generateData = await generateResponse.json();
        const generatedImage = generateData.data?.[0]?.b64_json;

        if (!generatedImage) {
          throw new Error("No image generated");
        }
        
        return generatedImage;
      }, { name: "image_generate" });

      // Encode and respond
      const imageUrl = `data:image/png;base64,${generatedImage}`;
      console.log("Variant generated successfully");

      // Log output
      rootSpan.log({
        output: { imageUrl },
        metadata: {
          duration: Date.now() - startTime,
        },
      });

      return new Response(
        JSON.stringify({ imageUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }, { name: "request" }) : (async () => {
      // Fallback when logger not available
      const { image, sceneDescription } = await req.json();
      
      if (!image) {
        return new Response(
          JSON.stringify({ error: "Image is required" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      if (!image.startsWith('data:image/')) {
        return new Response(
          JSON.stringify({ error: "Image must be a data URL (data:image/...)" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      const OPENAI_API_KEY = Deno.env.get("OPENAI_KEY");
      if (!OPENAI_API_KEY) {
        throw new Error("OPENAI_KEY is not configured");
      }

      // Execute without tracing
      const analysisResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: "Briefly describe this food: type, colors, and plating (max 50 words)." },
                { type: "image_url", image_url: { url: image } },
              ],
            },
          ],
          max_tokens: 100,
        }),
      });

      if (!analysisResponse.ok) {
        throw new Error(`Analysis failed: ${analysisResponse.status}`);
      }

      const analysisData = await analysisResponse.json();
      const productDescription = analysisData.choices?.[0]?.message?.content;
      if (!productDescription) throw new Error("No product description");

      const backgroundPrompt = sceneDescription || "professional food photography background, clean and appetizing";
      const fullPrompt = `Professional food photography: ${productDescription}. Setting: ${backgroundPrompt}. High-quality, appetizing presentation, marketing-ready image.`;

      const generateResponse = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-image-1",
          prompt: fullPrompt,
          n: 1,
          size: "1024x1024",
          quality: "high",
          output_format: "png",
        }),
      });

      if (!generateResponse.ok) throw new Error(`Failed to generate image`);
      const generateData = await generateResponse.json();
      const generatedImage = generateData.data?.[0]?.b64_json;
      if (!generatedImage) throw new Error("No image generated");

      const imageUrl = `data:image/png;base64,${generatedImage}`;
      return new Response(
        JSON.stringify({ imageUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    })());
  } catch (error) {
    console.error("Error in generate-food-variant:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
