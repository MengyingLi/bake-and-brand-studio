import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Import Braintrust SDK for Deno
let braintrust: any = null;
try {
  braintrust = await import("https://esm.sh/braintrust@0.4.8");
  console.log("✅ Braintrust SDK imported successfully");
} catch (e) {
  console.error("❌ Failed to import Braintrust SDK:", e);
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ 
        error: "Method not allowed. This endpoint only accepts POST requests.",
        usage: "Call this function from your app using supabase.functions.invoke()"
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }, 
        status: 405 
      }
    );
  }

  // Initialize Braintrust logger
  let logger;
  const BRAINTRUST_API_KEY = Deno.env.get("BRAINTRUST_API_KEY");
  
  console.log("🔍 Braintrust initialization check:", {
    hasBraintrustSDK: !!braintrust,
    hasAPIKey: !!BRAINTRUST_API_KEY,
    apiKeyLength: BRAINTRUST_API_KEY?.length || 0,
  });
  
  if (braintrust && BRAINTRUST_API_KEY) {
    try {
      logger = braintrust.initLogger({
        projectName: "Bake-and-Brand-Studio",
        apiKey: BRAINTRUST_API_KEY,
        asyncFlush: false,
      });
      console.log("✅ Braintrust logger initialized successfully");
    } catch (e) {
      console.error("❌ Failed to initialize Braintrust logger:", e);
    }
  } else {
    console.log("⚠️ Braintrust logging disabled:", {
      reason: !braintrust ? "SDK not loaded" : "API key not found"
    });
  }

  const startTime = Date.now();
  
  try {
    // Parse request body with error handling
    let requestBody;
    try {
      requestBody = await req.json();
      console.log("📥 Request body received successfully");
    } catch (parseError) {
      console.error("❌ Failed to parse request body:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid or empty request body" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    const { image, sceneDescription } = requestBody;
    
    // Log start of generation
    if (logger) {
      try {
        await logger.log({
          event: "image_generation",
          type: "start",
          input: {
            hasImage: !!image,
            hasSceneDescription: !!sceneDescription,
            sceneDescription: sceneDescription || "default",
            // Include the actual base64 image data so Braintrust can display it
            ...(image && image.startsWith('data:image/') && { image }),
          },
          metadata: {
            environment: "supabase-edge",
            timestamp: new Date().toISOString(),
          },
        });
        console.log("✅ Logged start event to Braintrust");
      } catch (e) {
        console.error("❌ Failed to log start event:", e);
      }
    }
    
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

    console.log("Step 1: Analyzing product image...");

    // Step 1: Analyze the product image with GPT-4o-mini vision (simplified for speed)
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

    console.log("Step 2: Generating new image with scene:", sceneDescription);

    // Step 2: Generate new image with the product description + desired background
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

    // Convert base64 to data URL
    const imageUrl = `data:image/png;base64,${generatedImage}`;

    console.log("Variant generated successfully");
    
    // Log successful completion
    if (logger) {
      try {
        const duration = Date.now() - startTime;
        await logger.log({
          event: "image_generation",
          type: "complete",
          input: {
            hasImage: !!image,
            hasSceneDescription: !!sceneDescription,
            sceneDescription: sceneDescription || "default",
            // Include the actual base64 input image data so Braintrust can display it
            ...(image && image.startsWith('data:image/') && { image }),
          },
          output: {
            success: true,
            hasGeneratedImage: true,
            // Include the actual base64 generated image data so Braintrust can display it
            generatedImage: imageUrl,
          },
          metadata: {
            environment: "supabase-edge",
            timestamp: new Date().toISOString(),
            duration,
          },
        });
        console.log("✅ Logged complete event to Braintrust");
      } catch (e) {
        console.error("❌ Failed to log complete event:", e);
      }
    }

    return new Response(
      JSON.stringify({ imageUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-food-variant:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    
    // Log error
    if (logger) {
      try {
        const duration = Date.now() - startTime;
        await logger.log({
          event: "image_generation",
          type: "error",
          error: errorMessage,
          metadata: {
            environment: "supabase-edge",
            timestamp: new Date().toISOString(),
            duration,
          },
        });
        console.log("✅ Logged error event to Braintrust");
      } catch (e) {
        console.error("❌ Failed to log error event:", e);
      }
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
