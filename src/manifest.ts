/**
 * Utility for reading and processing extension manifest files
 */
import { readFileSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import type { ExtensionManifest } from "./types";

export interface ReadManifestOptions {
  /** Root directory of the project */
  rootDir: string;
  /** Path to manifest.json (if not provided, will use extensionDir) */
  manifestPath?: string;
  /** Directory containing extension files (default: "haextension") */
  extensionDir?: string;
}

/**
 * Reads and processes the extension manifest.json file
 * Falls back to package.json version if manifest doesn't specify one
 */
export function readManifest(options: ReadManifestOptions): ExtensionManifest | null {
  const { rootDir, manifestPath, extensionDir = "haextension" } = options;

  // Determine manifest path
  const resolvedManifestPath = manifestPath
    ? resolvePath(rootDir, manifestPath)
    : resolvePath(rootDir, extensionDir, "manifest.json");

  try {
    const manifestContent = readFileSync(resolvedManifestPath, "utf-8");
    const parsed = JSON.parse(manifestContent);

    // Read version from package.json if not provided in manifest
    let version = parsed.version;
    if (!version) {
      try {
        const packageJsonPath = resolvePath(rootDir, "package.json");
        const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
        version = packageJson.version;
        console.log(`✓ [@haexhub/sdk] Using version from package.json: ${version}`);
      } catch (pkgError) {
        console.warn(`[@haexhub/sdk] Warning: Could not read version from package.json`);
      }
    }

    const manifest: ExtensionManifest = {
      name: parsed.name,
      version: version,
      author: parsed.author ?? null,
      entry: parsed.entry ?? null,
      icon: parsed.icon ?? null,
      public_key: parsed.public_key,
      signature: parsed.signature || "",
      permissions: parsed.permissions || {
        database: [],
        filesystem: [],
        http: [],
        shell: [],
      },
      homepage: parsed.homepage ?? null,
      description: parsed.description ?? null,
      single_instance: parsed.single_instance ?? null,
      display_mode: parsed.display_mode ?? null,
    };

    console.log(`✓ [@haexhub/sdk] Loaded ${resolvedManifestPath}`);
    return manifest;
  } catch (error) {
    console.warn(
      `[@haexhub/sdk] Warning: manifest.json not found at ${resolvedManifestPath}, extension info will not be available`
    );
    return null;
  }
}
