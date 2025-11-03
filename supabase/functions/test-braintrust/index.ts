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
    console.log("=== Testing Braintrust SDK in Deno/Supabase Edge ===");
    
    const BRAINTRUST_API_KEY = Deno.env.get("BRAINTRUST_API_KEY");
    
    console.log("1. Checking for API key:", BRAINTRUST_API_KEY ? "Found" : "Missing");
    
    // Try to import Braintrust SDK
    console.log("2. Attempting to import Braintrust SDK...");
    
    let braintrust;
    let importError;
    try {
      // Try using npm: import specifier for Deno
      braintrust = await import("npm:braintrust@0.4.8");
      console.log("3a. Successfully imported via npm: import");
    } catch (e) {
      importError = e;
      console.log("3b. npm: import failed:", e.message);
      
      try {
        // Try other import methods
        braintrust = await import("https://esm.sh/braintrust@0.4.8");
        console.log("3c. Successfully imported via esm.sh");
      } catch (e2) {
        console.log("3d. esm.sh import also failed:", e2.message);
      }
    }
    
    let testResult;
    if (braintrust && BRAINTRUST_API_KEY) {
      console.log("4. Attempting to initialize Braintrust logger...");
      try {
        const logger = braintrust.initLogger({
          projectName: "Deno-Test",
          apiKey: BRAINTRUST_API_KEY,
        });
        console.log("5. Logger initialized successfully");
        
        console.log("6. Attempting to log an event...");
        await logger.log({
          input: { test: "deno edge function" },
          output: "success",
          metadata: { environment: "supabase edge" },
        });
        console.log("7. Log event sent successfully");
        testResult = "SUCCESS: All steps completed";
      } catch (logError) {
        testResult = `FAILED at logging: ${logError.message}\n${logError.stack}`;
        console.error("Logging error:", logError);
      }
    } else {
      testResult = importError 
        ? `FAILED at import: ${importError.message}\n${importError.stack}`
        : "FAILED: Could not import SDK or missing API key";
    }
    
    return new Response(
      JSON.stringify({
        success: testResult.includes("SUCCESS"),
        result: testResult,
        apiKeyPresent: !!BRAINTRUST_API_KEY,
        sdkImported: !!braintrust,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});


