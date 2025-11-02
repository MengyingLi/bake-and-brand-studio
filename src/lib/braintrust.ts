import { initLogger } from "braintrust";

// Initialize Braintrust logger
const BRAINTRUST_API_KEY = import.meta.env.VITE_BRAINTRUST_API_KEY;

export const logger = BRAINTRUST_API_KEY
  ? initLogger({
      projectName: "Bake-and-Brand-Studio",
      apiKey: BRAINTRUST_API_KEY,
    })
  : null;

// Debug logging
console.log("Braintrust logger initialized:", {
  hasKey: !!BRAINTRUST_API_KEY,
  keyLength: BRAINTRUST_API_KEY?.length || 0,
  loggerExists: !!logger,
});

// Track timing metrics
const metrics: Record<string, number> = {};

export const logGenerationEvent = async (
  eventType: "start" | "complete" | "error",
  data: {
    imageUploaded?: boolean;
    sceneDescription?: string;
    step?: "analyzing" | "generating";
    error?: string;
    success?: boolean;
    imageSize?: number;
    duration?: number;
  }
) => {
  if (!logger) {
    console.log("Braintrust logging disabled - no API key configured");
    return;
  }

  try {
    // Track timing for this generation
    const timestamp = Date.now();
    const trackingKey = `${eventType}_${timestamp}`;
    
    if (eventType === "start") {
      metrics[trackingKey] = timestamp;
    } else if (eventType === "complete" || eventType === "error") {
      // Calculate duration if this is a completion
      const startTimes = Object.keys(metrics).filter(k => k.startsWith("start_"));
      if (startTimes.length > 0) {
        const latestStart = startTimes[startTimes.length - 1];
        const duration = timestamp - metrics[latestStart];
        data.duration = duration;
        delete metrics[latestStart];
      }
    }

    await logger.log({
      event: "image_generation",
      type: eventType,
      timestamp: new Date().toISOString(),
      metadata: {
        userAgent: navigator.userAgent,
        url: window.location.href,
      },
      ...data,
    });
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
  if (!logger) {
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
    });
  } catch (error) {
    console.error("Failed to log user interaction:", error);
  }
};

