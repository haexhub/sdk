// Type declarations for virtual modules provided by the Nuxt plugin

declare module "#haexhub/manifest" {
  /**
   * Extension manifest structure - automatically loaded from haextension/manifest.json
   */
  export interface Manifest {
    name: string;
    version: string;
    author: string | null;
    description: string | null;
    entry: string;
    icon: string | null;
    public_key: string;
    signature: string;
    permissions: {
      database: Array<unknown> | null;
      filesystem: Array<unknown> | null;
      http: Array<unknown> | null;
      shell: Array<unknown> | null;
    };
    homepage: string | null;
  }

  export const manifest: Manifest;
}
