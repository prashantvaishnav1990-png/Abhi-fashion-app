import { useEffect, useRef } from 'react';
import { BackNavigation, BackHandler } from '../services/backNavigation';

/**
 * Hook to automatically handle Android hardware back button & browser back
 * for any modal, drawer, view, or tab.
 *
 * @param isActive whether the modal/sub-view is currently active/open
 * @param onBack callback to close the modal or navigate back
 * @param priority priority in the navigation stack (higher = closes first)
 * @param name identifier for debugging and history tracking
 * @param pushHistory whether to push a window.history state entry
 */
export function useBackHandler(
  isActive: boolean,
  onBack: BackHandler,
  priority = 10,
  name = 'overlay',
  pushHistory = true
) {
  const handlerRef = useRef(onBack);
  handlerRef.current = onBack;

  useEffect(() => {
    if (!isActive) return;

    const unregister = BackNavigation.register(
      () => handlerRef.current(),
      priority,
      name,
      pushHistory
    );

    return () => {
      unregister();
    };
  }, [isActive, priority, name, pushHistory]);
}
