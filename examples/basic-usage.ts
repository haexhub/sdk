/**
 * Basic usage example for HaexHub SDK
 * This file demonstrates how extension developers would use the SDK
 */

import { createHaexHubClient, PermissionStatus } from "@haexhub/sdk";

// Initialize the client
const client = createHaexHubClient("demo-extension", true);

async function main() {
  try {
    // 1. Request permissions
    console.log("Requesting database permissions...");
    const permissionResponse = await client.requestPermission({
      permission: "db.write",
      resource: "notes",
      reason: "To store user notes",
    });

    if (permissionResponse.status !== PermissionStatus.GRANTED) {
      console.error("Permission denied!");
      return;
    }

    // 2. Create a table
    console.log("Creating notes table...");
    await client.db.createTable(
      "notes",
      `
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    `
    );

    // 3. Insert some notes
    console.log("Inserting notes...");
    const note1Id = await client.db.insert("notes", {
      title: "First Note",
      content: "This is my first note!",
    });

    const note2Id = await client.db.insert("notes", {
      title: "Second Note",
      content: "This is my second note!",
    });

    console.log(`Created notes with IDs: ${note1Id}, ${note2Id}`);

    // 4. Query notes
    console.log("Querying notes...");
    const allNotes = await client.db.query(
      "SELECT * FROM notes ORDER BY created_at DESC"
    );
    console.log("All notes:", allNotes);

    // 5. Update a note
    console.log("Updating note...");
    await client.db.update(
      "notes",
      {
        content: "Updated content!",
        updated_at: Math.floor(Date.now() / 1000),
      },
      "id = ?",
      [note1Id]
    );

    // 6. Get single note
    const updatedNote = await client.db.queryOne(
      "SELECT * FROM notes WHERE id = ?",
      [note1Id]
    );
    console.log("Updated note:", updatedNote);

    // 7. Count notes
    const noteCount = await client.db.count("notes");
    console.log(`Total notes: ${noteCount}`);

    // 8. Delete a note
    console.log("Deleting note...");
    await client.db.delete("notes", "id = ?", [note2Id]);

    // 9. List all tables
    const tables = await client.db.listTables();
    console.log("Available tables:", tables);

    // 10. Get table info
    const tableInfo = await client.db.getTableInfo("notes");
    console.log("Table info:", tableInfo);

    // 11. Listen to events
    client.on("database.changed", (event) => {
      console.log("Database changed:", event);
    });

    console.log("✅ All operations completed successfully!");
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

// Run the example
main().catch(console.error);

// Cleanup on exit
process.on("SIGINT", () => {
  console.log("Cleaning up...");
  client.destroy();
  process.exit(0);
});
