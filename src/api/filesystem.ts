import type { HaexHubClient } from "../client";

export interface SaveFileOptions {
  /**
   * The default filename to suggest
   */
  defaultPath?: string;

  /**
   * The title of the save dialog
   */
  title?: string;

  /**
   * File filters for the dialog
   */
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
}

export interface SaveFileResult {
  /**
   * The path where the file was saved
   */
  path: string;

  /**
   * Whether the operation was successful
   */
  success: boolean;
}

export interface OpenFileOptions {
  /**
   * The filename for the temporary file
   */
  fileName: string;

  /**
   * Optional MIME type for the file
   */
  mimeType?: string;
}

export interface OpenFileResult {
  /**
   * Whether the operation was successful
   */
  success: boolean;
}

export class FilesystemAPI {
  constructor(private client: HaexHubClient) {}

  /**
   * Opens a save file dialog and saves the provided data to the selected location
   * @param data The file data as Uint8Array
   * @param options Options for the save dialog
   * @returns The path where the file was saved, or null if cancelled
   */
  async saveFileAsync(
    data: Uint8Array,
    options: SaveFileOptions = {}
  ): Promise<SaveFileResult | null> {
    const result = await this.client.request<SaveFileResult | null>(
      "haextension.fs.saveFile",
      {
        data: Array.from(data), // Convert Uint8Array to regular array for postMessage
        defaultPath: options.defaultPath,
        title: options.title,
        filters: options.filters,
      }
    );

    return result;
  }

  /**
   * Opens a file with the system's default viewer
   * @param data The file data as Uint8Array
   * @param options Options for opening the file
   * @returns The result of the operation
   */
  async openFileAsync(
    data: Uint8Array,
    options: OpenFileOptions
  ): Promise<OpenFileResult> {
    const result = await this.client.request<OpenFileResult>(
      "haextension.fs.openFile",
      {
        data: Array.from(data), // Convert Uint8Array to regular array for postMessage
        fileName: options.fileName,
        mimeType: options.mimeType,
      }
    );

    return result;
  }
}
