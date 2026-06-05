import { clerkClient } from '@clerk/clerk-sdk-node';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  console.log("CLERK_SECRET_KEY loaded:", process.env.CLERK_SECRET_KEY ? "Yes (starts with " + process.env.CLERK_SECRET_KEY.substring(0, 10) + "...)" : "No");
  
  try {
    console.log("Attempting to connect to Clerk API...");
    // Fetch user list limit 1 to verify the secret key is valid
    const users = await clerkClient.users.getUserList({ limit: 1 });
    console.log("✅ Success! Successfully connected and authenticated with Clerk API.");
    console.log("Total users fetched:", users.length);
  } catch (error: any) {
    console.error("❌ Clerk API connection failed!");
    console.error("Error Name:", error.name);
    console.error("Error Message:", error.message);
    if (error.status) {
      console.error("HTTP Status Code:", error.status);
    }
  }
}

main();
