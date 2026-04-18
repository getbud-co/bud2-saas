import { useEffect, useRef, RefObject } from "react";

interface UseDragToCloseOptions {
  enabled?: boolean;
  threshold?: number;
  velocityThreshold?: number;
}

/**
 * Hook que implementa drag-to-close para painéis mobile (bottom sheets/drawers).
 * Detecta arraste vertical para baixo e fecha o painel quando o threshold é atingido.
 */
export function useDragToClose(
  panelRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  options: UseDragToCloseOptions = {},
) {
  const { enabled = true, threshold = 80, velocityThreshold = 0.5 } = options;

  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);
  const isDragging = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const panel = panelRef.current;
    if (!panel) return;

    function handleTouchStart(e: TouchEvent) {
      // Só ativa se o touch começar no topo do painel (primeiros 60px)
      const touch = e.touches[0];
      if (!touch) return;

      const rect = panel!.getBoundingClientRect();
      const relativeY = touch.clientY - rect.top;

      if (relativeY <= 60) {
        touchStartY.current = touch.clientY;
        touchStartTime.current = Date.now();
        isDragging.current = true;
      }
    }

    function handleTouchMove(e: TouchEvent) {
      if (!isDragging.current) return;

      const touch = e.touches[0];
      if (!touch) return;

      const deltaY = touch.clientY - touchStartY.current;

      // Só permite arrastar para baixo
      if (deltaY > 0) {
        // Aplica transform durante o arraste (feedback visual)
        panel!.style.transform = `translateY(${deltaY}px)`;

        // Reduz a opacidade proporcionalmente
        const opacity = Math.max(0.3, 1 - deltaY / 400);
        panel!.style.opacity = String(opacity);

        // Previne scroll do body durante o arraste
        e.preventDefault();
      }
    }

    function handleTouchEnd(e: TouchEvent) {
      if (!isDragging.current) return;

      const touch = e.changedTouches[0];
      if (!touch) return;

      const deltaY = touch.clientY - touchStartY.current;
      const deltaTime = Date.now() - touchStartTime.current;
      const velocity = deltaY / deltaTime; // px/ms

      // Fecha se ultrapassou o threshold OU se a velocidade é alta
      if (deltaY > threshold || velocity > velocityThreshold) {
        onClose();
      } else {
        // Reseta o transform com animação suave
        panel!.style.transition = "transform 250ms ease, opacity 250ms ease";
        panel!.style.transform = "";
        panel!.style.opacity = "";
        setTimeout(() => {
          panel!.style.transition = "";
        }, 250);
      }

      isDragging.current = false;
    }

    panel.addEventListener("touchstart", handleTouchStart, { passive: true });
    panel.addEventListener("touchmove", handleTouchMove, { passive: false });
    panel.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      panel.removeEventListener("touchstart", handleTouchStart);
      panel.removeEventListener("touchmove", handleTouchMove);
      panel.removeEventListener("touchend", handleTouchEnd);
    };
  }, [enabled, threshold, velocityThreshold, onClose, panelRef]);
}
