import { headers } from "next/headers";

interface RateLimitConfig {
  interval: number; // Time window in milliseconds
  uniqueTokenPerInterval: number; // Max requests per interval
}

type RateLimitStore = Record<string, {
  count: number;
  resetTime: number;
}>;

// In-memory store (for development/simple deployments)
// For production with multiple instances, consider Redis
const store: RateLimitStore = {};

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    if (store[key]!.resetTime < now) {
      delete store[key];
    }
  });
}, 60000); // Clean up every minute

export async function rateLimit(config: RateLimitConfig): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: Date;
}> {
  const headersList = await headers();
  
  // Get identifier (IP address or fallback)
  const forwardedRaw: string = headersList.get("x-forwarded-for") ?? "";
  const splitFirst = forwardedRaw.split(",")[0]?.trim();
  const forwardedFirst: string | undefined = splitFirst && splitFirst.length > 0 ? splitFirst : undefined;
  const realIp: string | undefined = headersList.get("x-real-ip") ?? undefined;
  const ip: string = forwardedFirst ?? realIp ?? "unknown";
  
  const now = Date.now();
  const key = `rate_limit:${ip}`;
  
  // Initialize or get existing entry
  if (!store[key] || store[key].resetTime <= now) {
    store[key] = {
      count: 0,
      resetTime: now + config.interval,
    };
  }
  
  const entry = store[key];
  
  // Check if limit exceeded
  if (entry.count >= config.uniqueTokenPerInterval) {
    return {
      success: false,
      limit: config.uniqueTokenPerInterval,
      remaining: 0,
      reset: new Date(entry.resetTime),
    };
  }
  
  // Increment counter
  entry.count++;
  
  return {
    success: true,
    limit: config.uniqueTokenPerInterval,
    remaining: config.uniqueTokenPerInterval - entry.count,
    reset: new Date(entry.resetTime),
  };
}

// Predefined rate limiting configs
export const authRateLimit = () => rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 5, // 5 login attempts per minute
});

export const apiRateLimit = () => rateLimit({
  interval: 60 * 1000, // 1 minute  
  uniqueTokenPerInterval: 100, // 100 API calls per minute
});
