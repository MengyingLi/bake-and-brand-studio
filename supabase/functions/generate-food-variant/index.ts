import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    console.log("Analyzing product image...");

    // Step 1: Analyze the product image with GPT-5 vision
    const analysisResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-2025-08-07",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Describe this food product in detail for image generation. Include: type of food, colors, textures, plating style, and any garnishes. Be specific and concise (max 100 words).",
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
        max_completion_tokens: 150,
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

    console.log("Product analyzed. Generating variant with scene:", sceneDescription);

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

    return new Response(
      JSON.stringify({ imageUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-food-variant:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
