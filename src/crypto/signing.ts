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
    // === VORBEREITUNG ===
    const manifestPath = path.join(extensionPath, "manifest.json");
    const originalManifestContent = await fs.readFile(manifestPath, "utf-8");
    const manifest = JSON.parse(originalManifestContent);

    // 1. Private Key importieren und Public Key ableiten
    const privateKeyBuffer = Buffer.from(privateKeyHex, "hex");
    const privateKey = await webcrypto.subtle.importKey(
      "pkcs8",
      privateKeyBuffer,
      { name: "Ed25519", namedCurve: "Ed25519" },
      true,
      ["sign"]
    );
    const publicKeyBuffer = await this.derivePublicKey(privateKeyBuffer);
    const publicKeyHex = Buffer.from(publicKeyBuffer).toString("hex");

    // === SIGNIERUNGSPROZESS ===

    // 2. Manifest für die Hash-Berechnung vorbereiten
    //    (Public Key rein, Signatur als leeren Platzhalter)
    manifest.public_key = publicKeyHex;
    manifest.signature = ""; // signature leeren um Hash zu berechnen
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    // 3. Hash vom "kanonischen Inhalt" berechnen
    //    Das Verzeichnis enthält jetzt die manifest.json mit leerer Signatur.
    const contentHash = await this.hashDirectory(extensionPath);

    console.log("content_hash:", contentHash);
    // 4. Echte Signatur aus diesem Hash erstellen
    const signatureBuffer = await webcrypto.subtle.sign(
      "Ed25519",
      privateKey,
      contentHash
    );
    const signatureHex = Buffer.from(signatureBuffer).toString("hex");

    // 5. Finale manifest.json mit der echten Signatur erstellen
    manifest.signature = signatureHex;
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    // === VERPACKUNG & AUFRÄUMEN ===

    // 6. Das Verzeichnis (das jetzt die finale manifest.json enthält) zippen
    const finalOutputPath =
      outputPath || `${manifest.id}-${manifest.version}.haextension`;
    const output = fsSync.createWriteStream(finalOutputPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    return new Promise((resolve, reject) => {
      output.on("close", async () => {
        // Aufräumen: Die Original-Manifest-Datei wiederherstellen
        await fs.writeFile(manifestPath, originalManifestContent);
        console.log(
          `✓ Extension packaged: ${finalOutputPath} (${archive.pointer()} bytes)`
        );
        resolve(finalOutputPath);
      });

      output.on("error", (err) => {
        // Bei Fehler ebenfalls aufräumen
        fs.writeFile(manifestPath, originalManifestContent).finally(() =>
          reject(err)
        );
      });
      archive.on("error", reject);

      archive.pipe(output);
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
