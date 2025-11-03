import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

console.log("=== Testing Braintrust SDK in Deno ===");

const BRAINTRUST_API_KEY = Deno.env.get("BRAINTRUST_API_KEY") || "sk-rprpw0XJ8EqPAnUNaD1PWosZcnxBldhv6QNtPlk0xsgUF0nd";

console.log("1. Checking for API key:", BRAINTRUST_API_KEY ? "Found" : "Missing");

// Try to import Braintrust SDK
console.log("2. Attempting to import Braintrust SDK...");

let braintrust;
let importError;
try {
  // Try using npm: import specifier for Deno
  braintrust = await import("npm:braintrust@0.4.8");
  console.log("3a. Successfully imported via npm:");
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
      input: { test: "deno test" },
      output: "success",
      metadata: { environment: "deno" },
    });
    console.log("7. Log event sent successfully");
    testResult = "SUCCESS: All steps completed";
  } catch (logError) {
    testResult = `FAILED at logging: ${logError.message}\nStack: ${logError.stack}`;
    console.error("Logging error:", logError);
  }
} else {
  testResult = importError 
    ? `FAILED at import: ${importError.message}\nStack: ${importError.stack}`
    : "FAILED: Could not import SDK or missing API key";
}

console.log("\n=== RESULT ===");
console.log(testResult);


