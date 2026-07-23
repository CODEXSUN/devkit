import {
  closeDevkitDatabase,
  createDevkitDatabase,
  migrateDevkitDatabase,
  seedDevkitDatabase
} from "./devkit-database.js";

const command = process.argv[2];

try {
  await createDevkitDatabase();
  if (command === "migrate") {
    await migrateDevkitDatabase();
  } else if (command === "seed") {
    await migrateDevkitDatabase();
    await seedDevkitDatabase();
  } else {
    throw new Error("Usage: tsx src/database/db-cli.ts <migrate|seed>");
  }
} finally {
  await closeDevkitDatabase();
}
