declare global {
  interface Window {
    goatcounter?: { count: (opts: { path: string; title?: string; event?: boolean }) => void };
  }
}

export function track(event: string, title?: string): void {
  try {
    window.goatcounter?.count({ path: event, title: title ?? event, event: true });
  } catch {
    // ad-blocked or not loaded; never break the game over analytics
  }
}
