/**
 * Reset database while preserving user accounts.
 *
 * Deletes all documents from every collection except `users`.
 * Run with: npm run reset:keep-users
 */

import mongoose from "mongoose";
import { config } from "dotenv";

config({ path: ".env.local" });

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/clinic-management";

const USERS_COLLECTION = "users";

async function resetKeepUsers() {
  console.log("Connecting to MongoDB...");

  await mongoose.connect(MONGODB_URI, {
    bufferCommands: false,
    maxPoolSize: 10,
  });

  console.log("Connected to MongoDB");

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Database connection is not available");
  }

  const collections = await db.listCollections().toArray();
  const targetCollections = collections
    .map((collection) => collection.name)
    .filter(
      (name) => name !== USERS_COLLECTION && !name.startsWith("system.")
    );

  if (targetCollections.length === 0) {
    console.log("No collections to clear. Only users collection exists.");
  } else {
    console.log(`Clearing ${targetCollections.length} collection(s)...`);

    for (const collectionName of targetCollections) {
      const collection = db.collection(collectionName);
      const before = await collection.countDocuments();
      await collection.deleteMany({});
      console.log(`- ${collectionName}: removed ${before} document(s)`);
    }
  }

  const usersCount = await db.collection(USERS_COLLECTION).countDocuments();
  console.log(`Users preserved: ${usersCount}`);

  await mongoose.disconnect();
  console.log("Disconnected from MongoDB");
}

resetKeepUsers().catch(async (error) => {
  console.error("Reset failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});
