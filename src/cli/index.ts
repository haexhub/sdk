// @haexhub/sdk/src/cli/index.ts

import { Command } from "commander";
import * as fs from "fs/promises";
import * as path from "path";
import { ExtensionSigner } from "~/crypto/signing";

const program = new Command();

program
  .name("haexhub")
  .description("HaexHub Extension Development Tools")
  .version("1.0.0");

program
  .command("keygen")
  .description("Generate a new keypair for signing extensions")
  .option("-o, --output <path>", "Output directory", ".")
  .action(async (options) => {
    const { publicKey, privateKey } = await ExtensionSigner.generateKeypair();

    const keyDir = path.resolve(options.output);
    await fs.mkdir(keyDir, { recursive: true });

    await fs.writeFile(path.join(keyDir, "public.key"), publicKey);
    await fs.writeFile(path.join(keyDir, "private.key"), privateKey);

    console.log("✓ Keypair generated:");
    console.log(`  Public:  ${path.join(keyDir, "public.key")}`);
    console.log(`  Private: ${path.join(keyDir, "private.key")}`);
    console.log("\n⚠️  Keep your private key safe and never commit it!");
  });

program
  .command("sign <extension-path>")
  .description("Sign and package an extension")
  .option("-k, --key <path>", "Private key file", "./private.key")
  .option("-o, --output <path>", "Output path for .haextension file")
  .action(async (extensionPath, options) => {
    try {
      const privateKey = await fs.readFile(options.key, "utf-8");
      const outputPath = await ExtensionSigner.packageExtension(
        extensionPath,
        privateKey.trim(),
        options.output
      );
      console.log(`\n✓ Extension signed and packaged: ${outputPath}`);
    } catch (error) {
      console.error("Error:", error);
      process.exit(1);
    }
  });

program.parse();
