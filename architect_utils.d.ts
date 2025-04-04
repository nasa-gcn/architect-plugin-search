declare module '@architect/utils' {
  type UpdaterMethods = Record<
    | 'start'
    | 'status'
    | 'done'
    | 'cancel'
    | 'err'
    | 'warn'
    | 'raw'
    | 'update'
    | 'stop'
    | 'error'
    | 'fail'
    | 'warning',
    (...args: unknown[]) => void
  >
  type Updater = UpdaterMethods & Record<'verbose' | 'debug', UpdaterMethods>
  function updater(name: string): Updater
}
