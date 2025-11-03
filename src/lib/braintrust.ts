// Braintrust logging is handled server-side in the edge function
// Client-side logging doesn't work due to CORS restrictions

// These are no-op functions to maintain compatibility
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
  console.log("Client-side Braintrust logging disabled (handled server-side)", { eventType, data });
};

export const logUserInteraction = async (
  action: "upload_image" | "enter_scene" | "download_image" | "clear_image",
  data?: {
    imageSize?: number;
    hasSceneDescription?: boolean;
  }
) => {
  console.log("Client-side Braintrust logging disabled (handled server-side)", { action, data });
};

