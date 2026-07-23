import { createServerFn } from "@tanstack/react-start";

// Circle App Kit "kit key" is an embeddable client credential (like a
// publishable key). We keep the raw value in a server secret and expose it
// to the browser through this server fn so it isn't hard-coded in the bundle.
export const getCircleKitKey = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env.CIRCLE_KIT_KEY;
  if (!key) throw new Error("CIRCLE_KIT_KEY is not configured");
  return { kitKey: key };
});
