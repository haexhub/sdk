// @haexhub/sdk/src/crypto/signing.ts
import { webcrypto } from "crypto";
import * as fs from "fs/promises";
import * as fsSync from "fs";
import * as path from "path";
import archiver from "archiver";

export class ExtensionSigner {
  /**
   * Generiert ein Ed25519 Keypair
   */
  static async generateKeypair(): Promise<{
    publicKey: string;
    privateKey: string;
  }> {
    const keypair = await webcrypto.subtle.generateKey(
      {
        name: "Ed25519",
        namedCurve: "Ed25519",
      },
      true,
      ["sign", "verify"]
    );

    const publicKeyBuffer = await webcrypto.subtle.exportKey(
      "raw",
      keypair.publicKey
    );
    const privateKeyBuffer = await webcrypto.subtle.exportKey(
      "pkcs8",
      keypair.privateKey
    );

    return {
      publicKey: Buffer.from(publicKeyBuffer).toString("hex"),
      privateKey: Buffer.from(privateKeyBuffer).toString("hex"),
    };
  }

  /**
   * Berechnet SHA-256 Hash aller Dateien in einem Verzeichnis
   */
  static async hashDirectory(dirPath: string): Promise<Buffer> {
    const files = await this.getAllFiles(dirPath);
    const sortedFiles = files.sort();

    const contents: Buffer[] = [];
    for (const file of sortedFiles) {
      const content = await fs.readFile(file);
      contents.push(content);
    }

    const combined = Buffer.concat(contents);
    const hashBuffer = await webcrypto.subtle.digest("SHA-256", combined);
    return Buffer.from(hashBuffer);
  }

  /**
   * Signiert eine Extension
   */
  static async signExtension(
    extensionPath: string,
    privateKeyHex: string
  ): Promise<{ signature: string; publicKey: string; hash: string }> {
    const privateKeyBuffer = Buffer.from(privateKeyHex, "hex");
    const privateKey = await webcrypto.subtle.importKey(
      "pkcs8",
      privateKeyBuffer,
      {
        name: "Ed25519",
        namedCurve: "Ed25519",
      },
      true,
      ["sign"]
    );

    const publicKeyBuffer = await this.derivePublicKey(privateKeyBuffer);
    const publicKeyHex = Buffer.from(publicKeyBuffer).toString("hex");

    const hash = await this.hashDirectory(extensionPath);

    const signatureBuffer = await webcrypto.subtle.sign(
      "Ed25519",
      privateKey,
      hash
    );

    return {
      signature: Buffer.from(signatureBuffer).toString("hex"),
      publicKey: publicKeyHex,
      hash: hash.toString("hex"),
    };
  }

  /**
   * Packt und signiert eine Extension
   */
  static async packageExtension(
    extensionPath: string,
    privateKeyHex: string,
    outputPath?: string
  ): Promise<string> {
    // 1. Signiere Extension
    const { signature, publicKey } = await this.signExtension(
      extensionPath,
      privateKeyHex
    );

    // 2. Manifest updaten
    const manifestPath = path.join(extensionPath, "manifest.json");
    const manifestContent = await fs.readFile(manifestPath, "utf-8");
    const manifest = JSON.parse(manifestContent);

    manifest.public_key = publicKey;
    manifest.signature = signature;

    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    // 3. ZIP erstellen mit archiver
    const finalOutputPath =
      outputPath || `${manifest.id}-${manifest.version}.haextension`;
    const output = fsSync.createWriteStream(finalOutputPath);
    const archive = archiver("zip", {
      zlib: { level: 9 }, // Maximale Kompression
    });

    return new Promise((resolve, reject) => {
      output.on("close", () => {
        console.log(
          `✓ Extension packaged: ${finalOutputPath} (${archive.pointer()} bytes)`
        );
        resolve(finalOutputPath);
      });

      output.on("error", reject);
      archive.on("error", reject);

      archive.pipe(output);

      // Alle Dateien aus dem Verzeichnis hinzufügen
      archive.directory(extensionPath, false);

      archive.finalize();
    });
  }

  // Helper Methods

  private static async getAllFiles(dirPath: string): Promise<string[]> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const files = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          return this.getAllFiles(fullPath);
        }
        return [fullPath];
      })
    );
    return files.flat();
  }

  private static async derivePublicKey(
    privateKeyBuffer: Buffer
  ): Promise<Uint8Array> {
    const privateKey = await webcrypto.subtle.importKey(
      "pkcs8",
      privateKeyBuffer,
      { name: "Ed25519", namedCurve: "Ed25519" },
      true,
      ["sign"]
    );

    const jwk = await webcrypto.subtle.exportKey("jwk", privateKey);
    const publicKeyJwk = { ...jwk, d: undefined, key_ops: ["verify"] };

    const publicKey = await webcrypto.subtle.importKey(
      "jwk",
      publicKeyJwk,
      { name: "Ed25519", namedCurve: "Ed25519" },
      true,
      ["verify"]
    );

    return new Uint8Array(await webcrypto.subtle.exportKey("raw", publicKey));
  }
}
