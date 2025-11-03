import type { HaexHubNuxtPlugin } from './nuxt.plugin.client'

declare module '#app' {
  interface NuxtApp {
    $haexhub: HaexHubNuxtPlugin
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $haexhub: HaexHubNuxtPlugin
  }
}

export {}
