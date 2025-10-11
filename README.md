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

## Framework Integration

The HaexHub SDK provides **framework-specific adapters** for seamless integration with popular frameworks:

### 🎯 Quick Start by Framework

<details>
<summary><b>Vue 3</b> - Composable with reactive refs</summary>

```bash
npm install @haexhub/sdk
```

```vue
<script setup lang="ts">
import { useHaexHub } from '@haexhub/sdk/vue';

const { extensionInfo, context, db, storage, getTableName } = useHaexHub({ debug: true });

// Automatically reactive!
watch(() => extensionInfo.value, (info) => {
  console.log('Extension loaded:', info);
});

// Create your own table - no permissions needed!
// Tables are automatically namespaced with your extension's keyHash
const tableName = getTableName('users');
await db.createTable(tableName, `
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL
`);

// Full read/write access to your own tables
await db.insert(tableName, {
  name: 'John Doe',
  email: 'john@example.com'
});

const users = await db.query<User>(`SELECT * FROM ${tableName}`);
</script>

<template>
  <div>
    <h1>{{ extensionInfo?.name }}</h1>
    <p>Theme: {{ context?.theme }}</p>
    <p>Users: {{ users.length }}</p>
  </div>
</template>
```

</details>

<details>
<summary><b>React</b> - Hook with automatic state updates</summary>

```bash
npm install @haexhub/sdk
```

```tsx
import { useHaexHub } from '@haexhub/sdk/react';
import { useEffect, useState } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
}

function App() {
  const { extensionInfo, context, db, getTableName } = useHaexHub({ debug: true });
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (!extensionInfo) return;

    async function initializeDatabase() {
      // Create your own table - no permissions needed!
      // Tables are automatically namespaced with your extension's keyHash
      const tableName = getTableName('users');

      await db.createTable(tableName, `
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL
      `);

      // Full read/write access to your own tables
      await db.insert(tableName, {
        name: 'John Doe',
        email: 'john@example.com'
      });

      // Query users
      const result = await db.query<User>(`SELECT * FROM ${tableName}`);
      setUsers(result);
    }

    initializeDatabase();
  }, [extensionInfo, db, getTableName]);

  return (
    <div>
      <h1>{extensionInfo?.name}</h1>
      <p>Theme: {context?.theme}</p>
      <ul>
        {users.map(user => (
          <li key={user.id}>{user.name} - {user.email}</li>
        ))}
      </ul>
    </div>
  );
}

export default App;
```

</details>

<details>
<summary><b>Svelte</b> - Stores with $-syntax reactivity</summary>

```bash
npm install @haexhub/sdk
```

**src/routes/+layout.svelte** (initialize once):
```svelte
<script lang="ts">
  import { initHaexHub } from '@haexhub/sdk/svelte';

  // Initialize SDK once at app root
  initHaexHub({ debug: true });
</script>

<slot />
```

**src/routes/+page.svelte**:
```svelte
<script lang="ts">
  import { extensionInfo, context, haexHub } from '@haexhub/sdk/svelte';
  import { onMount } from 'svelte';

  let users = [];

  onMount(async () => {
    // Create your own table - no permissions needed!
    // Tables are automatically namespaced with your extension's keyHash
    const tableName = haexHub.getTableName('users');

    await haexHub.db.createTable(tableName, `
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL
    `);

    // Full read/write access to your own tables
    await haexHub.db.insert(tableName, {
      name: 'John Doe',
      email: 'john@example.com'
    });

    users = await haexHub.db.query(`SELECT * FROM ${tableName}`);
  });
</script>

<!-- Automatically reactive with $ syntax! -->
<h1>{$extensionInfo?.name}</h1>
<p>Theme: {$context?.theme}</p>

<ul>
  {#each users as user}
    <li>{user.name} - {user.email}</li>
  {/each}
</ul>
```

</details>

<details>
<summary><b>Vanilla JS / Other Frameworks</b> - Core SDK</summary>

```bash
npm install @haexhub/sdk
```

```typescript
import { createHaexHubClient } from '@haexhub/sdk';

const client = createHaexHubClient({ debug: true });

// Subscribe to changes
client.subscribe(() => {
  console.log('Extension info:', client.extensionInfo);
  console.log('Context:', client.context);
});

// Create your own table - no permissions needed!
// Tables are automatically namespaced with your extension's keyHash
const tableName = client.getTableName('users');
await client.db.createTable(tableName, `
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL
`);

// Full read/write access to your own tables
const userId = await client.db.insert(tableName, {
  name: 'John Doe',
  email: 'john@example.com'
});

const users = await client.db.query(`SELECT * FROM ${tableName}`);
console.log(users);
```

</details>

### 📦 Available Adapters

| Framework | Import Path | Features |
|-----------|-------------|----------|
| **Vue 3** | `@haexhub/sdk/vue` | Composable with `ref` reactivity |
| **React** | `@haexhub/sdk/react` | Hook with state management |
| **Svelte** | `@haexhub/sdk/svelte` | Stores with `$` syntax |
| **Core** | `@haexhub/sdk` | Framework-agnostic client |

## Built-in Polyfills

The SDK automatically includes polyfills for browser APIs that don't work in custom protocol contexts (`haex-extension://`). **You don't need to do anything** - just import the SDK and everything works!

### What's Included

✅ **localStorage** - In-memory fallback when blocked
✅ **sessionStorage** - No-op implementation
✅ **Cookies** - In-memory cookie store
✅ **History API** - Hash-based routing fallback for SPAs

### How It Works

When you import the SDK:

```typescript
import { createHaexHubClient } from '@haexhub/sdk';
// Polyfills are automatically active!
```

The polyfills detect whether the native APIs work and only activate if needed. This means:

- **Zero configuration** - Works out of the box
- **Framework agnostic** - Works with Vue, React, Svelte, etc.
- **No performance impact** - Only activates when necessary
- **SPA-friendly** - Includes history API patches for client-side routing

### What This Means for You

You can build your extension using **any framework and any libraries** without worrying about custom protocol restrictions. Things that "just work":

- Vuex, Pinia, Zustand (state management using localStorage)
- Vue Router, React Router (client-side routing)
- Cookie-based authentication libraries
- Any npm package that uses localStorage/cookies

## Core Concepts

### 1. Cryptographic Identity

Each extension is identified by a **public key hash** (20 hex characters = 80 bits), not by name or namespace.

```typescript
// Extension ID format: {keyHash}_{name}_{version}
// Example: a7f3b2c1d4e5f6a8b9c0_password-manager_1.0.0
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

### 3. Permission System

HaexHub uses a **zero-trust permission model** with automatic isolation:

#### 🔓 Own Tables - Always Allowed

Your extension can **freely create, read, write, and delete** its own tables without any permissions:

```typescript
// ✅ Always works - no permissions needed!
const myTable = client.getTableName('users');

await client.db.createTable(myTable, '...');  // ✅ Create
await client.db.query(`SELECT * FROM ${myTable}`);  // ✅ Read
await client.db.insert(myTable, {...});  // ✅ Write
await client.db.delete(myTable, 'id = ?', [1]);  // ✅ Delete
```

**Why this is safe:**
- Tables are automatically prefixed with your `keyHash` (e.g., `a7f3b2c1d4e5f6a8b9c0_myext_users`)
- Impossible to access other extensions' tables
- Complete sandbox isolation
- No manifest declarations required

#### 🔒 Dependency Tables - Explicit Permission Required

To access **another extension's tables**, you must declare it in your manifest:

**manifest.json:**
```json
{
  "dependencies": [
    {
      "keyHash": "a7f3b2c1d4e5f6a8b9c0",
      "name": "password-manager",
      "minVersion": "1.0.0",
      "reason": "Access stored credentials",
      "tables": [
        {
          "table": "credentials",
          "operations": ["read"],
          "reason": "Retrieve login data for email sync"
        }
      ]
    }
  ]
}
```

**Code:**
```typescript
// ❌ Would fail without permission!
const depTable = client.getDependencyTableName(
  'a7f3b2c1d4e5f6a8b9c0',
  'password-manager',
  'credentials'
);

const creds = await client.db.query(`SELECT * FROM ${depTable}`);
```

**Permission Granularity:**
- ✅ **Per-table** - Request access to specific tables only
- ✅ **Per-operation** - `["read"]` or `["read", "write"]`
- ✅ **User consent** - User approves each permission
- ✅ **Revocable** - User can revoke anytime

## API Reference

### Vue 3 Adapter

```typescript
import { useHaexHub } from '@haexhub/sdk/vue';

const {
  client,          // Raw HaexHubClient instance
  extensionInfo,   // Readonly<Ref<ExtensionInfo | null>>
  context,         // Readonly<Ref<ApplicationContext | null>>
  db,              // DatabaseAPI
  storage,         // StorageAPI
  getTableName     // (tableName: string) => string
} = useHaexHub({ debug: true });

// Use in templates or computed
watch(() => extensionInfo.value, (info) => {
  console.log('Extension:', info?.name);
});
```

### React Adapter

```typescript
import { useHaexHub } from '@haexhub/sdk/react';

function MyComponent() {
  const {
    client,          // HaexHubClient instance
    extensionInfo,   // ExtensionInfo | null
    context,         // ApplicationContext | null
    db,              // DatabaseAPI
    storage,         // StorageAPI
    getTableName     // (tableName: string) => string
  } = useHaexHub({ debug: true });

  // State automatically updates on SDK changes
  return <div>{extensionInfo?.name}</div>;
}
```

### Svelte Adapter

```typescript
// Initialize once in +layout.svelte
import { initHaexHub } from '@haexhub/sdk/svelte';
initHaexHub({ debug: true });

// Use stores anywhere
import { extensionInfo, context, haexHub } from '@haexhub/sdk/svelte';

// In templates with $ syntax
<h1>{$extensionInfo?.name}</h1>

// In script
const tableName = haexHub.getTableName('users');
await haexHub.db.query(`SELECT * FROM ${tableName}`);
```

### Core Client API

#### Client Initialization

```typescript
import { createHaexHubClient } from '@haexhub/sdk';

const client = createHaexHubClient({
  debug: true,      // Optional: Enable debug logging
  timeout: 30000    // Optional: Request timeout in ms
});
```

#### Subscribe to Changes

```typescript
// Subscribe to SDK updates
const unsubscribe = client.subscribe(() => {
  console.log('Extension info:', client.extensionInfo);
  console.log('Context:', client.context);
});

// Cleanup
unsubscribe();
```

#### Extension Info

```typescript
// Get your extension's info
const info = client.extensionInfo;
// {
//   keyHash: "a7f3b2c1d4e5f6a8b9c0",
//   name: "my-extension",
//   fullId: "a7f3b2c1d4e5f6a8b9c0_my-extension_1.0.0",
//   version: "1.0.0",
//   namespace: "johndoe"  // Display only
// }
```

#### Table Names

```typescript
// Get table name for your extension
const myTable = client.getTableName("users");
// → "a7f3b2c1d4e5f6a8b9c0_my_extension_users"

// Get table name for a dependency
const depTable = client.getDependencyTableName(
  "b1c2d3e4f5a6b7c8d9e0",  // Dependency's keyHash
  "password-manager",      // Dependency's name
  "credentials"            // Table name
);
// → "b1c2d3e4f5a6b7c8d9e0_password_manager_credentials"
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
  ['Alice']
);

console.log(result.lastInsertId);
console.log(result.rowsAffected);
```

#### Transactions

```typescript
await client.db.transaction([
  `INSERT INTO ${myTable} (name) VALUES ('Alice')`,
  `INSERT INTO ${myTable} (name) VALUES ('Bob')`
]);
```

#### Helper Methods

```typescript
// Create table
await client.db.createTable('posts', `
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT
`);

// Check existence
const exists = await client.db.tableExists(myTable);

// Get table info
const info = await client.db.getTableInfo(myTable);

// List all tables
const tables = await client.db.listTables();

// Drop table
await client.db.dropTable('posts');

// Insert
const id = await client.db.insert(myTable, {
  name: 'John',
  email: 'john@example.com'
});

// Update
const updated = await client.db.update(
  myTable,
  { name: 'Jane' },
  'id = ?',
  [id]
);

// Delete
const deleted = await client.db.delete(myTable, 'id = ?', [id]);

// Count
const count = await client.db.count(myTable, 'age > ?', [18]);
```

### Storage API

```typescript
// Store data
await client.storage.setItem('theme', 'dark');

// Retrieve data
const theme = await client.storage.getItem('theme');

// Remove data
await client.storage.removeItem('theme');

// Get all keys
const keys = await client.storage.keys();

// Clear all
await client.storage.clear();
```

### Dependencies

```typescript
// Get all dependencies
const deps = await client.getDependencies();

// Each dependency has:
// {
//   keyHash: string,
//   name: string,
//   version: string,
//   fullId: string
// }
```

### Permissions

```typescript
// Request permission (runtime - usually done via manifest)
const response = await client.requestDatabasePermission({
  resource: 'a7f3b2c1d4e5f6a8b9c0_password_manager_credentials',
  operation: 'read',
  reason: 'To retrieve email credentials'
});

if (response.status === 'granted') {
  // Permission granted!
}

// Check if permission exists
const hasPermission = await client.checkDatabasePermission(
  'a7f3b2c1d4e5f6a8b9c0_password_manager_credentials',
  'read'
);
```

### Events

```typescript
// Listen to context changes
client.on('context.changed', (event) => {
  console.log('Context changed:', event.data.context);
});

// Listen to search requests
client.on('search.request', (event) => {
  const { query, requestId } = event.data;

  // Respond with search results
  await client.respondToSearch(requestId, [
    {
      id: '1',
      title: 'Result 1',
      description: 'Description',
      type: 'item',
      score: 0.9
    }
  ]);
});

// Remove listener
const callback = (event) => console.log(event);
client.on('some-event', callback);
client.off('some-event', callback);
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
import { useHaexHub } from '@haexhub/sdk/vue';

const { db, getTableName } = useHaexHub();

// Create credentials table - no permissions needed for own tables!
const credentialsTable = getTableName('credentials');
await db.createTable(credentialsTable, `
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service TEXT NOT NULL,
  username TEXT NOT NULL,
  password TEXT NOT NULL
`);

// Store credentials - full access to own tables
await db.insert(credentialsTable, {
  service: 'gmail',
  username: 'john@example.com',
  password: 'encrypted_password'
});
```

### Extension B: Email Client

**manifest.json** - Must declare dependency and request permission:

```json
{
  "name": "email-client",
  "version": "1.0.0",

  "dependencies": [
    {
      "keyHash": "a7f3b2c1d4e5f6a8b9c0",
      "name": "password-manager",
      "minVersion": "1.0.0",
      "reason": "Access stored credentials for email sync",
      "tables": [
        {
          "table": "credentials",
          "operations": ["read"],
          "reason": "Retrieve Gmail login credentials"
        }
      ]
    }
  ]
}
```

**Code:**

```typescript
import { useHaexHub } from '@haexhub/sdk/react';

function EmailClient() {
  const { db, client } = useHaexHub();

  async function loadCredentials() {
    // Access Password Manager's credentials table
    // ✅ Works because we declared permission in manifest
    const credentialsTable = client.getDependencyTableName(
      'a7f3b2c1d4e5f6a8b9c0',   // Password Manager's keyHash
      'password-manager',        // Extension name
      'credentials'              // Table name
    );

    // Read Gmail credentials (read permission granted via manifest)
    const creds = await db.queryOne(
      `SELECT username, password FROM ${credentialsTable} WHERE service = ?`,
      ['gmail']
    );

    if (creds) {
      connectToGmail(creds.username, creds.password);
    }
  }

  return <button onClick={loadCredentials}>Connect Gmail</button>;
}
```

**User Experience:**
1. User installs Email Client extension
2. HaexHub shows permission request: "Email Client wants to **read** the **credentials** table from Password Manager"
3. User sees the reason: "Retrieve Gmail login credentials"
4. User approves or denies
5. Permission can be revoked anytime in settings

## Extension Signing & Packaging

HaexHub Extensions must be cryptographically signed to ensure authenticity and prevent tampering. The SDK provides tools to generate keypairs, sign, and package your extensions.

### 1. Generate a Keypair (One-time Setup)

Before publishing your extension, generate a keypair:

```bash
npx haexhub keygen
```

This creates two files:

- `public.key` - Include this in your repository
- `private.key` - Keep this secret! Add to `.gitignore`

**Important**: **Never commit your private.key**. Anyone with this key can impersonate your extension.

### 2. Add Keys to .gitignore

```gitignore
private.key
*.key
!public.key
```

### 3. Build and Sign Your Extension

Add scripts to your `package.json`:

```json
{
  "scripts": {
    "build": "nuxt generate",
    "package": "haexhub sign dist -k private.key",
    "build:release": "npm run build && npm run package"
  },
  "devDependencies": {
    "@haexhub/sdk": "^0.1.0"
  }
}
```

Then build and package:

```bash
npm run build:release
```

This creates `your-extension-1.0.0.haextension` - a signed ZIP file ready for distribution.

**OR** build your extension and run:

```bash
npx haexhub sign dist -k private.key
```

### 4. What Gets Signed?

The signing process:

1. Computes SHA-256 hash of all files in your extension
2. Signs the hash with your private key using Ed25519
3. Adds `public_key` and `signature` to your `manifest.json`
4. Creates a `.haextension` file (ZIP archive)

### 5. Verification

When users install your extension:

1. HaexHub extracts the `.haextension` file
2. Verifies the signature using the `public_key`
3. Computes the hash and checks it matches
4. Rejects installation if verification fails

This ensures the extension hasn't been modified since you signed it.

### 6. Key Management Best Practices

- **Backup your private key** - Store it securely (password manager, encrypted backup)
- **One key per extension** - Don't reuse keys across different extensions
- **Rotate keys carefully** - Key changes require users to reinstall your extension
- **Lost key = lost extension** - You cannot update an extension without the original key

## Security Features

### ✅ Automatic Isolation

- **Own tables**: Full CRUD access without permissions
- **Table namespacing**: Automatic prefix with keyHash prevents conflicts
- **Sandbox isolation**: Extensions cannot access each other's data by default
- **No manifest bloat**: No need to declare own tables

### ✅ Cryptographic Identity

- Each extension identified by public key hash
- Impossible to impersonate another extension
- Works across all registries
- Tamper-proof signing with Ed25519

### ✅ Granular Permissions

- **Per-table permissions**: Request access to specific tables only
- **Per-operation control**: `read` and/or `write` per table
- **Explicit manifest declarations**: Dependencies must be declared upfront
- **User consent required**: All cross-extension access needs approval
- **Human-readable reasons**: Users see why permission is needed

### ✅ Dependency Validation

- Must declare dependencies in manifest
- Extension name must match keyHash
- Version requirements enforced (semver)
- Missing dependencies prevent installation

### ✅ Runtime Verification

- Every database access validated in real-time
- Permission checks on every query
- User can revoke permissions anytime
- No way to bypass permission system
- Audit trail for all cross-extension access

## TypeScript Support

Full TypeScript support included:

```typescript
import type {
  ExtensionInfo,
  ApplicationContext,
  DatabaseQueryResult,
  PermissionStatus
} from '@haexhub/sdk';
```

## Error Handling

```typescript
import { ErrorCode } from '@haexhub/sdk';

try {
  await client.db.query(`SELECT * FROM ${someTable}`);
} catch (error) {
  if (error.code === ErrorCode.PERMISSION_DENIED) {
    console.error('Permission denied');
  } else if (error.code === ErrorCode.TIMEOUT) {
    console.error('Request timeout');
  } else {
    console.error('Error:', error.message);
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

ISC

## Support

- Documentation: https://github.com/haexhub/sdk
- GitHub: https://github.com/haexhub/sdk
- Issues: https://github.com/haexhub/sdk/issues
