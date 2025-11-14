/**
 * Central request method name definitions for HaexHub SDK
 *
 * Request Naming Schema: haextension:{subject}:{action}
 *
 * These are used for client.request() calls between extensions and HaexHub
 */

export const HAEXTENSION_METHODS = {
  context: {
    get: 'haextension:context:get',
  },

  database: {
    query: 'haextension:database:query',
    execute: 'haextension:database:execute',
    transaction: 'haextension:database:transaction',
  },

  filesystem: {
    saveFile: 'haextension:filesystem:save-file',
    openFile: 'haextension:filesystem:open-file',
    showImage: 'haextension:filesystem:show-image',
  },

  storage: {
    getItem: 'haextension:storage:get-item',
    setItem: 'haextension:storage:set-item',
    removeItem: 'haextension:storage:remove-item',
    clear: 'haextension:storage:clear',
    keys: 'haextension:storage:keys',
  },

  web: {
    fetch: 'haextension:web:fetch',
  },

  application: {
    open: 'haextension:application:open',
  },
} as const;

// Helper type to extract all string values from nested object
type DeepValues<T> = T extends object
  ? T[keyof T] extends string
    ? T[keyof T]
    : T[keyof T] extends object
    ? DeepValues<T[keyof T]>
    : never
  : never;

export type HaextensionMethod = DeepValues<typeof HAEXTENSION_METHODS>;
