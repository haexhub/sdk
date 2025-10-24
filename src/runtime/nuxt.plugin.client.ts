import { defineNuxtPlugin } from "nuxt/app";
import { shallowRef } from "vue";
import { HaexHubClient } from "~/client";
import type { ExtensionManifest } from "~/types";

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
    context: client.context,
  });

  // 3. Warte auf die Initialisierung des Clients
  await client.ready();

  // 4. Setze den initialen State, sobald der Client bereit ist
  console.log('[Nuxt Plugin] Client ready, context:', client.context);
  state.value = {
    isReady: true,
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

  // 6. Stelle den Client und den reaktiven State bereit
  return {
    provide: {
      haexhub: {
        client, // Der rohe Client (für db.query etc.)
        state, // Der reaktive State (für die UI)
      },
    },
  };
});
