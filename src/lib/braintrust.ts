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
    image?: string; // Image data URL or base64
    sceneDescription?: string;
    error?: string;
    success?: boolean;
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
    const hasImage = !!data.image && data.image.startsWith('data:image/');
    const sceneDesc = data.sceneDescription || "default";

    // Build log entry matching halloween agent pattern
    const logEntry: any = {
      event: "image_generation",
      type: eventType,
      input: {
        hasImage,
        hasSceneDescription: !!data.sceneDescription,
        sceneDescription: sceneDesc,
      },
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
      logEntry.output = {
        success: data.success ?? true,
        hasGeneratedImage: true,
      };
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
