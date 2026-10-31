/**
 * Central Back Navigation and Hardware/Gesture Back Button Manager
 * Works across Capacitor Android APK, Mobile PWA, and Web Browsers.
 */

export type BackHandler = () => boolean | void;

interface StackEntry {
  id: string;
  name: string;
  handler: BackHandler;
  priority: number;
  hasHistory: boolean;
}

class BackNavigationService {
  private stack: StackEntry[] = [];
  private idCounter = 0;
  private programmaticPopCount = 0;
  private isCapacitorInitialized = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', this.handleBrowserPopState);
      this.initCapacitorBackListener();
    }
  }

  private initCapacitorBackListener() {
    if (this.isCapacitorInitialized) return;
    this.isCapacitorInitialized = true;

    import('@capacitor/app')
      .then(({ App: CapApp }) => {
        CapApp.addListener('backButton', ({ canGoBack }) => {
          // Hardware or Gesture back button pressed on Android device
          const handled = this.popTop();
          if (handled) {
            // A modal, view or drawer was popped.
            // Also sync browser history
            this.programmaticPopCount++;
            try {
              window.history.back();
            } catch {}
          } else {
            // Stack is empty (user is at root Home)
            try {
              CapApp.exitApp();
            } catch {}
          }
        }).catch(() => {});
      })
      .catch(() => {});
  }

  /**
   * Register a dismiss/back handler onto the stack.
   * Higher priority handlers are executed first.
   */
  public register(
    handler: BackHandler,
    priority = 10,
    name = 'overlay',
    pushHistoryState = true
  ): () => void {
    const id = `back_${++this.idCounter}_${name}`;

    let pushed = false;
    if (pushHistoryState && typeof window !== 'undefined') {
      try {
        window.history.pushState({ abhiBackId: id, name }, '');
        pushed = true;
      } catch (err) {
        console.warn('[BackNav] Failed to push history state:', err);
      }
    }

    const entry: StackEntry = {
      id,
      name,
      handler,
      priority,
      hasHistory: pushed,
    };

    // Keep stack sorted by priority ascending (highest priority at the end / top of stack)
    this.stack.push(entry);
    this.stack.sort((a, b) => a.priority - b.priority);

    // Return cleanup / unregister function
    return () => {
      this.unregister(id);
    };
  }

  /**
   * Unregister a handler when component unmounts or state changes
   */
  public unregister(id: string) {
    const idx = this.stack.findIndex((item) => item.id === id);
    if (idx !== -1) {
      const [removed] = this.stack.splice(idx, 1);
      // If removed manually from UI while history was pushed, pop the history entry cleanly
      if (removed.hasHistory && typeof window !== 'undefined') {
        this.programmaticPopCount++;
        try {
          window.history.back();
        } catch {}
      }
    }
  }

  /**
   * Pops and executes the topmost handler. Returns true if handled, false if stack was empty.
   */
  public popTop(): boolean {
    if (this.stack.length === 0) {
      return false;
    }

    // Pop the highest priority item from the end
    const entry = this.stack.pop();
    if (!entry) return false;

    try {
      const res = entry.handler();
      return res !== false;
    } catch (e) {
      console.error('[BackNav] Error executing back handler:', e);
      return true;
    }
  }

  /**
   * Browser popstate event handler (triggered by browser back button or gesture back in web/PWA)
   */
  private handleBrowserPopState = () => {
    if (this.programmaticPopCount > 0) {
      this.programmaticPopCount--;
      return;
    }

    // Execute topmost handler
    this.popTop();
  };

  /**
   * Check if there are active overlays in stack
   */
  public hasActiveOverlays(): boolean {
    return this.stack.length > 0;
  }
}

export const BackNavigation = new BackNavigationService();
