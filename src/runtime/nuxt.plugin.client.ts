import { defineNuxtPlugin } from "#app";
import { shallowRef } from "vue";
import { HaexHubClient } from "~/client";

export default defineNuxtPlugin(async (nuxtApp) => {
  // 1. Erstelle die Client-Instanz
  const client = new HaexHubClient({
    // @ts-ignore
    debug: nuxtApp.payload.config.public.debug ?? false,
  });

  // 2. Erstelle einen reaktiven Container (shallowRef ist performant)
  const state = shallowRef({
    isReady: false,
    context: client.context,
    extensionInfo: client.extensionInfo,
  });

  // 3. Warte auf die Initialisierung des Clients
  await client.ready();

  // 4. Setze den initialen State, sobald der Client bereit ist
  state.value = {
    isReady: true,
    context: client.context,
    extensionInfo: client.extensionInfo,
  };

  // 5. Nutze dein Pub/Sub-Pattern, um auf künftige Updates zu lauschen
  client.subscribe(() => {
    // Triggere ein Update für das shallowRef
    state.value = {
      ...state.value, // Behalte isReady bei
      context: client.context,
      extensionInfo: client.extensionInfo,
    };
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
