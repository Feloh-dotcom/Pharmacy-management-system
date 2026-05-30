import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data_store.json");
if (!fs.existsSync(DATA_FILE)) {
  console.error("data_store.json does not exist!");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));

console.log("=== LOCAL DATA_STORE.JSON SUMMARY ===");
for (const [key, val] of Object.entries(data)) {
  if (Array.isArray(val)) {
    console.log(`- ${key}: ${val.length} records`);
    if (val.length > 0) {
      console.log("  Sample keys:", Object.keys(val[0]));
    }
  } else if (typeof val === "object" && val !== null) {
    console.log(`- ${key}: Object keys:`, Object.keys(val));
  } else {
    console.log(`- ${key}:`, val);
  }
}
