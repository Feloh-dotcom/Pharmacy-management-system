import { initSupabaseSync } from "./server_db";

async function run() {
  console.log("=== Running initSupabaseSync ===");
  try {
    await initSupabaseSync();
    console.log("Initialization complete!");
  } catch (err: any) {
    console.error("Initialization failed:", err.message);
  }
}

run();
