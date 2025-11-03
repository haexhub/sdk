import { defineNuxtPlugin } from "nuxt/app";
import { shallowRef, type ShallowRef } from "vue";
import { HaexHubClient } from "~/client";
import type { ExtensionManifest, ApplicationContext } from "~/types";

export default defineNuxtPlugin(async (nuxtApp) => {
  // Get manifest from runtime config (injected by Nuxt module)
  const manifest = nuxtApp.$config.public.haexhubManifest as ExtensionManifest | null;

  // 1. Erstelle die Client-Instanz
  const client = new HaexHubClient({
    // @ts-ignore
    debug: nuxtApp.payload.config.public.debug ?? false,
    manifest: manifest || undefined,
  });

  // 2. Erstelle einen reaktiven Container (shallowRef ist performant)
  const state = shallowRef({
    isReady: false,
    isSetupComplete: false,
    context: client.context,
  });

  // 3. Warte auf die Initialisierung des Clients
  await client.ready();

  // 4. Setze den initialen State, sobald der Client bereit ist
  console.log('[Nuxt Plugin] Client ready, context:', client.context);
  state.value = {
    isReady: true,
    isSetupComplete: false,
    context: client.context,
  };
  console.log('[Nuxt Plugin] Initial state set:', state.value);

  // 5. Nutze dein Pub/Sub-Pattern, um auf künftige Updates zu lauschen
  client.subscribe(() => {
    console.log('[Nuxt Plugin] Client context updated:', client.context);
    // Triggere ein Update für das shallowRef
    state.value = {
      ...state.value, // Behalte isReady bei
      context: client.context,
    };
    console.log('[Nuxt Plugin] State updated:', state.value);
  });

  // 6. Warte auf Setup-Completion (läuft in background, blockiert Plugin nicht)
  client.setupComplete().then(() => {
    console.log('[Nuxt Plugin] Setup complete');
    state.value = {
      ...state.value,
      isSetupComplete: true,
    };
  });

  // 7. Stelle den Client und den reaktiven State bereit
  const haexhubPlugin = {
    client, // Der rohe Client (für client.orm, client.database, etc.)
    state, // Der reaktive State (für die UI)
  };

  return {
    provide: {
      haexhub: haexhubPlugin,
    },
  };
});

// Export type for type declarations
export type HaexHubNuxtPlugin = {
  client: HaexHubClient;
  state: ShallowRef<{
    isReady: boolean;
    isSetupComplete: boolean;
    context: ApplicationContext | null;
  }>;
};
