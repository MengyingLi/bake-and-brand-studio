// Test script for the Edge Function with Braintrust logging
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Import Braintrust SDK for Deno
let braintrust: any = null;
try {
  braintrust = await import("https://esm.sh/braintrust@0.4.8");
} catch (e) {
  console.error("Failed to import Braintrust SDK:", e);
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize Braintrust logger
let logger;
if (braintrust) {
  const BRAINTRUST_API_KEY = Deno.env.get("BRAINTRUST_API_KEY") || "sk-rprpw0XJ8EqPAnUNaD1PWosZcnxBldhv6QNtPlk0xsgUF0nd";
  if (BRAINTRUST_API_KEY) {
    logger = braintrust.initLogger({
      projectName: "Bake-and-Brand-Studio",
      apiKey: BRAINTRUST_API_KEY,
      asyncFlush: false,
    });
  }
}

const startTime = Date.now();

// Log start of generation
if (logger) {
  await logger.log({
    event: "image_generation",
    type: "start",
    input: {
      hasImage: true,
      hasSceneDescription: true,
      sceneDescription: "test",
    },
    metadata: {
      environment: "supabase-edge",
      timestamp: new Date().toISOString(),
    },
  });
}

// Simulate some work
await new Promise(resolve => setTimeout(resolve, 1000));

// Log successful completion
if (logger) {
  const duration = Date.now() - startTime;
  await logger.log({
    event: "image_generation",
    type: "complete",
    input: {
      hasImage: true,
      hasSceneDescription: true,
      sceneDescription: "test",
    },
    output: {
      success: true,
      hasGeneratedImage: true,
    },
    metadata: {
      environment: "supabase-edge",
      timestamp: new Date().toISOString(),
      duration,
    },
  });
  console.log("✅ Test completed! Check Braintrust dashboard.");
} else {
  console.log("❌ Logger not initialized");
}


