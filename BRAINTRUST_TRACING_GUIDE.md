# Braintrust Tracing Integration Guide

## Overview

This project uses Braintrust for tracing and logging AI interactions in Supabase Edge Functions. Braintrust provides detailed observability into AI workflows, including inputs, outputs, latency, and nested operations.

## What is Braintrust Tracing?

Braintrust tracing allows you to:
- Monitor AI model calls and their performance
- Debug issues with detailed logs of inputs and outputs
- Track duration and metadata for each operation
- View nested operations (spans) within a trace
- Analyze patterns across multiple requests

## Integration Steps Completed

### 1. Braintrust SDK Installation

Both edge functions (`brainstorm-recipe` and `generate-food-variant`) import the Braintrust SDK:

```typescript
// Import Braintrust SDK for Deno
let braintrust: any = null;
try {
  braintrust = await import("npm:braintrust@0.4.8");
  console.log("✅ Braintrust SDK imported successfully");
} catch (e) {
  console.error("❌ Failed to import Braintrust SDK:", e);
}
```

### 2. Environment Variable Configuration

The `BRAINTRUST_API_KEY` must be set as a Supabase secret:

- **Key**: `BRAINTRUST_API_KEY`
- **Value**: Your Braintrust API key from https://www.braintrust.dev

### 3. Logger Initialization

Each edge function initializes the Braintrust logger:

```typescript
let logger;
if (braintrust) {
  const BRAINTRUST_API_KEY = Deno.env.get("BRAINTRUST_API_KEY");
  if (BRAINTRUST_API_KEY) {
    logger = braintrust.initLogger({
      projectName: "Bake-and-Brand-Studio",
      apiKey: BRAINTRUST_API_KEY,
      asyncFlush: false,
    });
  }
}
```

### 4. Logging Schema (Current Implementation)

Both edge functions use a consistent logging pattern with `rootSpan.log()`:

#### For `brainstorm-recipe`:

```typescript
// Log request input
rootSpan.log({
  input: {
    ingredients,
    month,
    season,
  },
  metadata: {
    environment: "supabase-edge",
    timestamp: new Date().toISOString(),
  },
});

// Log output
rootSpan.log({
  output: recipeIdeas,
  metadata: {
    duration: Date.now() - startTime,
  },
});
```

#### For `generate-food-variant`:

```typescript
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

// Log output
rootSpan.log({
  output: { imageUrl },
  metadata: {
    duration: Date.now() - startTime,
  },
});
```

## How to Use Braintrust Tracing

### 1. View Traces in Braintrust Dashboard

1. Go to https://www.braintrust.dev
2. Log in to your account
3. Select the "Bake-and-Brand-Studio" project
4. Click on "Logs" or "Traces" to view your data

### 2. What You'll See in Traces

Each trace includes:
- **Input**: The data sent to the function (ingredients, scene description, etc.)
- **Output**: The generated result (recipe ideas, image URLs, etc.)
- **Metadata**: 
  - Duration (how long the operation took)
  - Timestamp (when it occurred)
  - Environment (supabase-edge)
- **Nested Spans**: Sub-operations like AI Gateway calls, prompt building, response parsing

### 3. Debugging with Traces

When something goes wrong:
1. Check the Braintrust dashboard for recent traces
2. Look at the input to verify what data was sent
3. Check the duration to identify performance issues
4. Examine nested spans to find where failures occurred
5. Review error messages in the logs

## Edge Function URLs

To test the functions and generate traces:

- **Recipe Generator**: 
  ```
  https://tkxytufbaroztfgieubb.supabase.co/functions/v1/brainstorm-recipe
  ```

- **Image Variant Generator**:
  ```
  https://tkxytufbaroztfgieubb.supabase.co/functions/v1/generate-food-variant
  ```

## Testing Traces Locally

You can test the Braintrust integration using the test file:

```bash
cd supabase/functions/test-braintrust
deno run --allow-net --allow-env test.ts
```

## Key Changes Made

### Reverted Logging Schema

The logging was simplified to the original schema:
- Input logs contain the raw request data
- Output logs contain the full response
- Metadata includes duration and timestamps
- Removed complex preview formatting and schema versioning

### Benefits of Current Schema

1. **Simplicity**: Easy to understand what data is being logged
2. **Completeness**: Full input/output data is captured
3. **Consistency**: Both functions use the same pattern
4. **Debuggability**: Raw data makes it easier to diagnose issues

## Troubleshooting

### Traces Not Appearing in Braintrust

1. Verify `BRAINTRUST_API_KEY` is set in Supabase secrets
2. Check edge function logs for Braintrust import success/failure
3. Ensure `asyncFlush: false` is set in logger initialization
4. Verify network connectivity from edge functions

### Import Errors

If you see "Failed to import Braintrust SDK":
- Ensure you're using `npm:braintrust@0.4.8` import syntax
- Check Deno version compatibility
- Verify network access from edge functions

### Missing Data in Traces

If traces appear but data is missing:
- Check that `rootSpan.log()` is called after operations complete
- Verify input/output variables exist before logging
- Review error handling to ensure logs aren't skipped on errors

## Additional Resources

- [Braintrust Documentation](https://www.braintrust.dev/docs)
- [Original Setup Guide](./BRAINTRUST_SETUP.md)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
