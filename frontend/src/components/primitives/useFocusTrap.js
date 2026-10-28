import { useEffect, useRef } from 'react';

/**
 * useFocusTrap - Accessible focus trapping hook for Modals, Drawers & Dialogs
 * Traps Tab / Shift+Tab within the container and restores focus to previous active element on close.
 */
export function useFocusTrap(isOpen, containerRef, onClose) {
  const previousActiveElementRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    previousActiveElementRef.current = document.activeElement;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (onClose) onClose();
        return;
      }

      if (e.key !== 'Tab') return;

      const container = containerRef.current;
      if (!container) return;

      const focusableElements = container.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length === 0) {
        e.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    // Auto focus first element after mounting
    const timer = setTimeout(() => {
      if (containerRef.current) {
        const firstFocusable = containerRef.current.querySelector(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (firstFocusable) {
          firstFocusable.focus();
        } else {
          containerRef.current.focus?.();
        }
      }
    }, 50);

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      if (previousActiveElementRef.current && previousActiveElementRef.current.focus) {
        previousActiveElementRef.current.focus();
      }
    };
  }, [isOpen, containerRef, onClose]);
}

export default useFocusTrap;
