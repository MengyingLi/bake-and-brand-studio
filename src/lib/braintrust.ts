import { initLogger } from "braintrust";

// Initialize Braintrust logger
const BRAINTRUST_API_KEY = import.meta.env.VITE_BRAINTRUST_API_KEY;

export const logger = BRAINTRUST_API_KEY
  ? initLogger({
      projectName: "Bake-and-Brand-Studio",
      apiKey: BRAINTRUST_API_KEY,
      asyncFlush: false, // Send logs immediately
    })
  : null;

// Debug logging
console.log("Braintrust logger initialized:", {
  hasKey: !!BRAINTRUST_API_KEY,
  keyLength: BRAINTRUST_API_KEY?.length || 0,
  loggerExists: !!logger,
  envKeys: Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')),
});

// Track timing metrics
const metrics: Record<string, number> = {};

export const logGenerationEvent = async (
  eventType: "start" | "complete" | "error",
  data: {
    image?: string; // Image data URL or base64 (input image)
    sceneDescription?: string;
    error?: string;
    success?: boolean;
    generatedImage?: string; // Generated image data URL or base64 (output image)
  }
) => {
  if (!logger) {
    console.log("Braintrust logging disabled - no API key configured");
    return;
  }

  try {
    const startTime = Date.now();
    const trackingKey = `start_${startTime}`;
    
    if (eventType === "start") {
      metrics[trackingKey] = startTime;
    }

    // Calculate duration for complete/error events
    let duration: number | undefined;
    if (eventType === "complete" || eventType === "error") {
      const startTimes = Object.keys(metrics).filter(k => k.startsWith("start_"));
      if (startTimes.length > 0) {
        const latestStart = startTimes[startTimes.length - 1];
        duration = startTime - metrics[latestStart];
        delete metrics[latestStart];
      }
    }

    // Check if image is a valid data URL (data:image/ prefix)
    // Halloween agent uses exact format: data:image/jpeg;base64,${base64Image} or data:image/png;base64,${base64Image}
    const hasImage = !!data.image && data.image.startsWith('data:image/');
    const sceneDesc = data.sceneDescription || "default";

    // Build log entry matching halloween agent pattern
    // Include the actual base64 image data so Braintrust can display it
    const input: any = {
      hasImage,
      hasSceneDescription: !!data.sceneDescription,
      sceneDescription: sceneDesc,
    };
    
    // Explicitly add image field if it exists (don't use spread operator)
    // Ensure exact format matches halloween agent: data:image/[type];base64,[base64string]
    if (hasImage && data.image) {
      // Verify the format matches halloween agent pattern exactly
      if (data.image.match(/^data:image\/(png|jpeg|jpg|webp|gif);base64,/)) {
        input.image = data.image;
        console.log("✅ Including image in Braintrust log (format matches halloween agent, length:", data.image.length, "chars)");
        console.log("   Image prefix:", data.image.substring(0, 30) + "...");
      } else {
        console.warn("⚠️ Image format doesn't match expected pattern:", data.image.substring(0, 50));
        // Still include it, but log a warning
        input.image = data.image;
      }
    } else {
      console.log("⚠️ No image to include in log:", { hasImage, imageExists: !!data.image });
    }

    const logEntry: any = {
      event: "image_generation",
      type: eventType,
      input,
      metadata: {
        environment: "browser",
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      },
    };

    // Add duration to metadata for complete/error events
    if (duration !== undefined) {
      logEntry.metadata.duration = duration;
    }

    // Add output for complete events
    if (eventType === "complete") {
      const output: any = {
        success: data.success ?? true,
        hasGeneratedImage: true,
      };
      
      // Explicitly add generated image if it exists
      if (data.generatedImage) {
        output.generatedImage = data.generatedImage;
      }
      
      logEntry.output = output;
    }

    // Add error for error events
    if (eventType === "error" && data.error) {
      logEntry.error = data.error;
    }

    await logger.log(logEntry);
  } catch (error) {
    console.error("Failed to log to Braintrust:", error);
  }
};

// Log user interactions
export const logUserInteraction = async (
  action: "upload_image" | "enter_scene" | "download_image" | "clear_image",
  data?: {
    imageSize?: number;
    hasSceneDescription?: boolean;
  }
) => {
  console.log("logUserInteraction called:", { action, data, hasLogger: !!logger });
  
  if (!logger) {
    console.log("Logger is null, skipping logUserInteraction");
    return;
  }

  try {
    await logger.log({
      event: "user_interaction",
      action,
      timestamp: new Date().toISOString(),
      metadata: {
        userAgent: navigator.userAgent,
        url: window.location.href,
      },
      ...data,
    } as any);
    console.log("Successfully logged user interaction");
  } catch (error) {
    console.error("Failed to log user interaction:", error);
  }
};
