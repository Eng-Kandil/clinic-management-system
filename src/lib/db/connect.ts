import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local"
  );
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongoose ?? { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30000;

// Wire connection event listeners once
mongoose.connection.on("error", (err) => {
  console.error(
    "[MongoDB] Connection error:",
    process.env.NODE_ENV === "production" ? "DB error" : err
  );
});
mongoose.connection.on("disconnected", () => {
  console.warn("[MongoDB] Disconnected from database");
});
mongoose.connection.on("reconnected", () => {
  console.log("[MongoDB] Reconnected to database");
});

// Graceful shutdown
if (process.env.NODE_ENV !== "test") {
  process.on("SIGINT", async () => {
    await mongoose.disconnect();
    console.log("[MongoDB] Disconnected due to app termination");
    process.exit(0);
  });
  process.on("SIGTERM", async () => {
    await mongoose.disconnect();
    console.log("[MongoDB] Disconnected due to SIGTERM");
    process.exit(0);
  });
}

async function connectWithRetry(retries = 0): Promise<typeof mongoose> {
  mongoose.set("strictQuery", true);
  mongoose.set("autoIndex", process.env.NODE_ENV !== "production");

  const opts = {
    bufferCommands: false,
    maxPoolSize: 10,
  };

  try {
    const conn = await mongoose.connect(MONGODB_URI as string, opts);
    console.log("[MongoDB] Connected successfully");
    return conn;
  } catch (error) {
    if (retries >= MAX_RETRIES) {
      console.error("[MongoDB] Max retries reached. Could not connect.");
      throw error;
    }
    const delay = Math.min(
      RETRY_DELAY_MS * Math.pow(2, retries),
      MAX_RETRY_DELAY_MS
    );
    console.warn(
      `[MongoDB] Connection failed. Retrying in ${delay}ms... (attempt ${retries + 1}/${MAX_RETRIES})`
    );
    await new Promise((resolve) => setTimeout(resolve, delay));
    return connectWithRetry(retries + 1);
  }
}

export default async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = connectWithRetry(0).catch((error) => {
      cached.promise = null;
      throw error;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}
