import type plugin from './nuxt.plugin.client'

type HaexHubPlugin = ReturnType<typeof plugin>['provide']['haexhub']

declare module '#app' {
  interface NuxtApp {
    $haexhub: HaexHubPlugin
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $haexhub: HaexHubPlugin
  }
}

export {}
