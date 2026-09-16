import { useEffect, useRef } from "react";

// Keep keyboard focus inside the topmost dialog and restore the opener on close.
export function useDialog(onClose) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const previous = document.activeElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusables = () => [...element.querySelectorAll('button:not(:disabled), a[href], input, select, textarea, [tabindex="0"]')].filter(node => node.getClientRects().length);
    (focusables()[0] || element).focus({ preventScroll: true });
    function keydown(event) {
      const dialogs = [...document.querySelectorAll('[aria-modal="true"]')];
      if (dialogs.at(-1) !== element) return;
      if (event.key === "Escape") { event.preventDefault(); closeRef.current(); }
      if (event.key !== "Tab") return;
      const nodes = focusables();
      if (!nodes.length) { event.preventDefault(); element.focus(); return; }
      const first = nodes[0], last = nodes.at(-1);
      if (event.shiftKey && (document.activeElement === first || !element.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !element.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      document.body.style.overflow = originalOverflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  return ref;
}
