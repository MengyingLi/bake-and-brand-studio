# Braintrust Logging Setup for Bake and Brand Studio

## Summary

Successfully added Braintrust logging to the Bake and Brand Studio app running on Lovable (Supabase Edge Functions).

## Key Findings

### ✅ What Works
1. **Node.js server-side apps**: Braintrust SDK works perfectly
2. **Deno/Supabase Edge Functions**: Successfully tested and integrated
3. **Backend logging**: All metrics and events logged correctly

### ❌ What Doesn't Work
1. **Browser/client-side**: CORS errors prevent direct browser logging
2. **Direct Lovable access**: Supabase secrets may be managed by Lovable

## Implementation

### Edge Function Integration

**File**: `supabase/functions/generate-food-variant/index.ts`

```typescript
// Import Braintrust SDK for Deno
let braintrust: any = null;
try {
  braintrust = await import("https://esm.sh/braintrust@0.4.8");
} catch (e) {
  console.error("Failed to import Braintrust SDK:", e);
}

// Initialize logger in each request
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

### What Gets Logged

1. **Start Event**: When generation begins
   - Image upload status
   - Scene description
   - Timestamp

2. **Complete Event**: On successful generation
   - Success status
   - Duration
   - Generated image status
   - Timestamp

3. **Error Event**: On failures
   - Error message
   - Duration
   - Timestamp

## Testing

### Local Deno Test ✅
```bash
export PATH="$HOME/.deno/bin:$PATH"
cd supabase/functions/test-braintrust
deno run --allow-net --allow-env test.ts
```

**Result**: SUCCESS - All steps completed

### Node.js Version ✅
Created a standalone Node.js version in `bake-and-brand-studio-node/`:

```bash
cd bake-and-brand-studio-node
BRAINTRUST_API_KEY="sk-rprpw0XJ8EqPAnUNaD1PWosZcnxBldhv6QNtPlk0xsgUF0nd" node index.js pose-example.jpg "elegant restaurant"
```

**Result**: SUCCESS - Logs sent to Braintrust

## Configuration Required

### Supabase Edge Function Secret

**Key**: `BRAINTRUST_API_KEY`  
**Value**: `sk-rprpw0XJ8EqPAnUNaD1PWosZcnxBldhv6QNtPlk0xsgUF0nd`

**Where to add**: 
- Supabase Dashboard → Project Settings → Edge Functions → Secrets
- OR Lovable Project Settings (if managed by Lovable)

**Note**: If you don't have direct Supabase access, you may need to contact Lovable support or check if Lovable has a way to manage Edge Function secrets.

## Results

All code pushed to GitHub and ready to deploy. Once the secret is configured, logs will automatically flow to Braintrust from the live Lovable app.

## Contact Your Coworker

Tell them:
> "I tested Braintrust SDK in Deno and it works! The CORS error was from browser usage. From Edge Functions (backend), logging works perfectly. I've integrated it into the app - just need to add the API key as a Supabase secret."

## Dashboard

View logs at: https://www.braintrust.dev (after deployment and secret configuration)

