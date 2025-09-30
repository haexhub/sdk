# @haexhub/sdk

Official SDK for building HaexHub extensions with cryptographic identity and granular permissions.

## Installation

```bash
npm install @haexhub/sdk
# or
pnpm add @haexhub/sdk
# or
yarn add @haexhub/sdk
```

## Quick Start

```typescript
import { createHaexHubClient } from "@haexhub/sdk";

const client = createHaexHubClient({ debug: true });

// Wait for initialization
await new Promise((resolve) => setTimeout(resolve, 100));

// Your extension info (provided by HaexHub)
console.log(client.extensionInfo);
// {
//   keyHash: "a7f3b2c1d4e5f6a8b9c0",
//   name: "my-extension",
//   version: "1.0.0",
//   ...
// }

// Create your own table (automatic full access)
const myTable = client.getTableName("users");
await client.db.createTable(
  myTable,
  `
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL
`
);

// Insert data
const userId = await client.db.insert(myTable, {
  name: "John Doe",
  email: "john@example.com",
});

// Query data
const users = await client.db.query(`SELECT * FROM ${myTable}`);
```

## Core Concepts

### 1. Cryptographic Identity

Each extension is identified by a **public key hash** (20 hex characters = 80 bits), not by name or namespace.

```typescript
// Extension ID format: {keyHash}/{name}@{version}
// Example: a7f3b2c1d4e5f6a8b9c0/password-manager@1.0.0
```

**Benefits:**

- ✅ Mathematically unique (no collisions)
- ✅ Tamper-proof (signed with private key)
- ✅ Registry-independent (works everywhere)

### 2. Table Naming

All tables are automatically prefixed with your extension's identity:

```typescript
const tableName = client.getTableName("users");
// Result: "a7f3b2c1d4e5f6a8b9c0_my_extension_users"
```

**Own tables:** Automatic full read/write access  
**Dependency tables:** Requires explicit permission

### 3. Granular Permissions

**Own Tables:** Automatic access, no permissions needed

```typescript
// No permission required!
await client.db.query(`SELECT * FROM ${myTable}`);
await client.db.insert(myTable, {...});
```

**Dependency Tables:** Explicit permission per table + operation

```json
{
  "dependencies": [
    {
      "keyHash": "a7f3b2c1d4e5f6a8b9c0",
      "name": "password-manager",
      "tables": [
        {
          "table": "credentials",
          "operations": ["read"],
          "reason": "To retrieve email credentials"
        }
      ]
    }
  ]
}
```

## API Reference

### Client Initialization

```typescript
import { HaexHubClient } from "@haexhub/sdk";

const client = new HaexHubClient({
  debug: true, // Optional: Enable debug logging
  timeout: 30000, // Optional: Request timeout in ms
});
```

### Extension Info

```typescript
// Get your extension's info
const info = client.extensionInfo;
// {
//   keyHash: "a7f3b2c1d4e5f6a8b9c0",
//   name: "my-extension",
//   fullId: "a7f3b2c1d4e5f6a8b9c0/my-extension@1.0.0",
//   version: "1.0.0",
//   namespace: "johndoe"  // Display only
// }
```

### Table Names

```typescript
// Get table name for your extension
const myTable = client.getTableName("users");
// → "a7f3b2c1d4e5f6a8b9c0_my_extension_users"

// Get table name for a dependency
const depTable = client.getDependencyTableName(
  "b1c2d3e4f5a6b7c8d9e0", // Dependency's keyHash
  "password-manager", // Dependency's name
  "credentials" // Table name
);
// → "b1c2d3e4f5a6b7c8d9e0_password_manager_credentials"

// Convenience method (validates dependency exists)
const table = await client.getDependencyTable(
  "b1c2d3e4f5a6b7c8d9e0",
  "password-manager",
  "credentials"
);
```

### Database Operations

#### Query

```typescript
// SELECT queries
const users = await client.db.query<User>(
  `SELECT * FROM ${myTable} WHERE age > ?`,
  [18]
);

// Single row
const user = await client.db.queryOne<User>(
  `SELECT * FROM ${myTable} WHERE id = ?`,
  [1]
);
```

#### Execute

```typescript
// INSERT, UPDATE, DELETE
const result = await client.db.execute(
  `INSERT INTO ${myTable} (name) VALUES (?)`,
  ["Alice"]
);

console.log(result.lastInsertId);
console.log(result.rowsAffected);
```

#### Transactions

```typescript
await client.db.transaction([
  `INSERT INTO ${myTable} (name) VALUES ('Alice')`,
  `INSERT INTO ${myTable} (name) VALUES ('Bob')`,
]);
```

#### Helper Methods

```typescript
// Create table
await client.db.createTable(
  "posts",
  `
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT
`
);

// Check existence
const exists = await client.db.tableExists(myTable);

// Get table info
const info = await client.db.getTableInfo(myTable);

// List all tables
const tables = await client.db.listTables();

// Drop table
await client.db.dropTable("posts");

// Insert
const id = await client.db.insert(myTable, {
  name: "John",
  email: "john@example.com",
});

// Update
const updated = await client.db.update(myTable, { name: "Jane" }, "id = ?", [
  id,
]);

// Delete
const deleted = await client.db.delete(myTable, "id = ?", [id]);

// Count
const count = await client.db.count(myTable, "age > ?", [18]);
```

### Dependencies

```typescript
// Get all dependencies
const deps = await client.getDependencies();

// Get specific dependency
const passwordManager = await client.getDependency("a7f3b2c1d4e5f6a8b9c0");

if (passwordManager) {
  console.log(passwordManager.name); // "password-manager"
  console.log(passwordManager.version); // "1.2.0"
}
```

### Permissions

```typescript
// Request permission (runtime - usually done via manifest)
const response = await client.requestDatabasePermission({
  resource: "a7f3b2c1d4e5f6a8b9c0_password_manager_credentials",
  operation: "read",
  reason: "To retrieve email credentials",
});

if (response.status === "granted") {
  // Permission granted!
}

// Check if permission exists
const hasPermission = await client.checkDatabasePermission(
  "a7f3b2c1d4e5f6a8b9c0_password_manager_credentials",
  "read"
);
```

### Events

```typescript
// Listen to events from HaexHub
client.on("database.changed", (event) => {
  console.log("Database changed:", event.data);
});

// Remove listener
const callback = (event) => console.log(event);
client.on("some-event", callback);
client.off("some-event", callback);
```

### Cleanup

```typescript
// Clean up when extension is destroyed
client.destroy();
```

## Manifest Structure

Your extension needs a `manifest.json` file:

```json
{
  "name": "my-extension",
  "version": "1.0.0",
  "description": "My awesome extension",

  "publicKey": "-----BEGIN PUBLIC KEY-----\n...",
  "signature": "...",

  "namespace": "johndoe",
  "displayName": "My Extension",
  "author": "John Doe <john@example.com>",
  "icon": "icon.png",
  "main": "index.html",

  "permissions": ["http.fetch", "notifications.show"],

  "dependencies": [
    {
      "keyHash": "a7f3b2c1d4e5f6a8b9c0",
      "name": "password-manager",
      "minVersion": "1.0.0",
      "reason": "To access stored credentials",
      "tables": [
        {
          "table": "credentials",
          "operations": ["read"],
          "reason": "Read email login credentials"
        }
      ]
    }
  ]
}
```

## Cross-Extension Access Example

### Extension A: Password Manager

```typescript
import { createHaexHubClient } from "@haexhub/sdk";

const client = createHaexHubClient();

// Create credentials table
const credentialsTable = client.getTableName("credentials");
await client.db.createTable(
  credentialsTable,
  `
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service TEXT NOT NULL,
  username TEXT NOT NULL,
  password TEXT NOT NULL
`
);

// Store credentials
await client.db.insert(credentialsTable, {
  service: "gmail",
  username: "john@example.com",
  password: "encrypted_password",
});
```

### Extension B: Email Client

**manifest.json:**

```json
{
  "name": "email-client",
  "dependencies": [
    {
      "keyHash": "a7f3b2c1d4e5f6a8b9c0",
      "name": "password-manager",
      "tables": [
        {
          "table": "credentials",
          "operations": ["read"]
        }
      ]
    }
  ]
}
```

**Code:**

```typescript
import { createHaexHubClient } from "@haexhub/sdk";

const client = createHaexHubClient();

// Get Password Manager's credentials table
const credentialsTable = await client.getDependencyTable(
  "a7f3b2c1d4e5f6a8b9c0", // Password Manager's keyHash
  "password-manager", // Extension name
  "credentials" // Table name
);

if (credentialsTable) {
  // Read Gmail credentials
  const creds = await client.db.queryOne(
    `SELECT username, password FROM ${credentialsTable} WHERE service = ?`,
    ["gmail"]
  );

  // Use credentials to connect
  if (creds) {
    connectToGmail(creds.username, creds.password);
  }
}
```

## Extension Signing & Packaging

HaexHub Extensions must be cryptographically signed to ensure authenticity and prevent tampering. The SDK provides tools to generate keypairs, sign, and package your extensions.

### 1. Generate a Keypair (One-time Setup)

Before publishing your extension, generate a keypair:

```bash
npx haexhub keygen
```

This creates two files:

public.key - Include this in your repository

private.key - Keep this secret! Add to .gitignore

**Important**: **Never commit your private.key**. Anyone with this key can impersonate your extension.

### 2. Add Keys to .gitignore

```gitignore
private.key
\*.key
!public.key
```

### 3. Build and Sign Your Extension

Add scripts to your package.json:

```json
{
  "scripts": {
    "build": "nuxt generate",
    "package": "haexhub sign dist -k private.key",
    "build:release": "npm run build && npm run package"
  },
  "devDependencies": {
    "@haexhub/sdk": "^1.0.0"
  }
}
```

Then build and package:

```bash
npm run build:release
```

This creates your-extension-1.0.0.haextension - a signed ZIP file ready for distribution.

### 4. What Gets Signed?

The signing process:

1. Computes SHA-256 hash of all files in your extension
2. Signs the hash with your private key using Ed25519
3. Adds public_key and signature to your manifest.json
4. Creates a .haextension file (ZIP archive)

### 5. Manifest Structure

After signing, your manifest will include:

```json
{
  "id": "your-extension",
  "name": "Your Extension",
  "version": "1.0.0",
  "public_key": "a3f5b9c2d1e8f4a6b7c3...",
  "signature": "d4e6f8a1b2c3d4e5f6a7...",
  "permissions": {
    "database": {
      "read": ["*"],
      "write": ["*"]
    }
  }
}
```

### 6. Verification

When users install your extension:

1. HaexHub extracts the .haextension file
2. Verifies the signature using the public_key
3. Computes the hash and checks it matches
4. Rejects installation if verification fails

This ensures the extension hasn't been modified since you signed it.

### 7. Key Management Best Practices

- Backup your private key - Store it securely (password manager, encrypted backup)
- One key per extension - Don't reuse keys across different extensions
- Rotate keys carefully - Key changes require users to reinstall your extension
- Lost key = lost extension - You cannot update an extension without the original key

## Security Features

### ✅ Cryptographic Identity

- Each extension identified by public key hash
- Impossible to impersonate another extension
- Works across all registries

### ✅ Granular Permissions

- Per-table, per-operation permissions
- Own tables: automatic access
- Dependency tables: explicit user consent

### ✅ Dependency Validation

- Must declare dependencies in manifest
- Extension name must match keyHash
- Version requirements enforced

### ✅ Runtime Verification

- Every database access validated
- User can revoke permissions anytime
- No way to bypass permission system

## TypeScript Support

Full TypeScript support included:

```typescript
import type {
  ExtensionInfo,
  DatabaseQueryResult,
  PermissionStatus,
} from "@haexhub/sdk";
```

## Error Handling

```typescript
import { ErrorCode } from "@haexhub/sdk";

try {
  await client.db.query(`SELECT * FROM ${someTable}`);
} catch (error) {
  if (error.code === ErrorCode.PERMISSION_DENIED) {
    console.error("Permission denied");
  } else if (error.code === ErrorCode.TIMEOUT) {
    console.error("Request timeout");
  } else {
    console.error("Error:", error.message);
  }
}
```

## Development

```bash
# Install dependencies
pnpm install

# Build the SDK
pnpm build

# Watch mode for development
pnpm dev

# Link locally for testing
pnpm link
```

## License

MIT

## Support

- Documentation: https://github.com/haexhub/sdk
- GitHub: https://github.com/haexhub/sdk
- Issues: https://github.com/haexhub/sdk/issues
