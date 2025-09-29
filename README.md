HaexHub SDKThe official TypeScript SDK for interacting with the HaexHub Tauri application backend from your frontend.InstallationYou can install the SDK using your favorite package manager:# Using npm
npm install @haexhub/sdk

# Using yarn

yarn add @haexhub/sdk

# Using pnpm

pnpm add @haexhub/sdk
UsageFirst, import and instantiate the HaexHubClient. Then, you can use the client to access different API modules, such as the database.import { HaexHubClient } from '@haexhub/sdk';

// This code should run in your Tauri frontend (e.g., inside a React component)
async function useSDK() {
const client = new HaexHubClient();

// Set a value in the database
await client.database.set('user:settings', { theme: 'dark' });

// Get a value from the database
const settings = await client.database.get('user:settings');
console.log(settings); // { theme: 'dark' }
}
APIThe SDK is structured into modules.client.databaseProvides methods to interact with the persistent storage of the Tauri application..get<T>(key: string): Promise<T | null>: Retrieves a value by its key..set<T>(key: string, value: T): Promise<void>: Sets a value for a key..remove(key: string): Promise<void>: Removes a key-value pair..list<T>(options?: { startsWith: string }): Promise<T[]>: Lists all records, optionally filtered by a key prefix.ContributingContributions are welcome! Please open an issue or submit a pull request on the main haex-hub repository.LicenseThis SDK is licensed under the MIT License.
