import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import type { GameControls } from "../../app/useGameController";
import { CardImage } from "../components/CardImage";
import { placePopover, type HoverPopoverStore } from "./hoverPopover";

/**
 * The layer the hover popover renders in, outside the lanes (which clip). It ignores the mouse and is
 * hidden from assistive tech. Sizes come from CSS; the popover's and the anchor's rects are read only to
 * place it, right before it paints.
 *
 * It closes on any pointerdown (a click acts), any scroll (a lane scrolling moves the tile; scroll events
 * don't bubble, so this listens in the capture phase), a resize and the window losing focus. The page
 * closes it on every game change.
 */
export function HoverPopoverLayer({ controls, store }: { controls: GameControls; store: HoverPopoverStore }) {
  const open = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hide = () => store.hide();
    window.addEventListener("pointerdown", hide, true);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    window.addEventListener("blur", hide);
    return () => {
      window.removeEventListener("pointerdown", hide, true);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
      window.removeEventListener("blur", hide);
      store.hide();
    };
  }, [store]);

  useLayoutEffect(() => {
    const popover = popoverRef.current;
    const layer = popover?.parentElement;
    if (!open || !popover || !layer) return;
    if (!open.anchor.isConnected) {
      store.hide();
      return;
    }
    const { x, y } = placePopover(
      open.anchor.getBoundingClientRect(),
      { width: popover.offsetWidth, height: popover.offsetHeight },
      { width: layer.clientWidth, height: layer.clientHeight },
      open.content.placement,
    );
    popover.style.left = `${x}px`;
    popover.style.top = `${y}px`;
  }, [open, store]);

  return (
    <div className="gpd-popover-layer" aria-hidden="true">
      {open && (
        <div ref={popoverRef} className="gpd-popover" data-count={open.content.items.length}>
          <div className="gpd-popover-panel">
            {open.content.items.map(item => (
              <div key={item.card.instanceId} className="gpd-popover-item">
                <div className={item.accent ? "gpd-popover-label is-accent" : "gpd-popover-label"}>
                  <span className="gpd-popover-label-text">{item.label}</span>
                  {item.note && <span className="gpd-popover-label-note">{item.note}</span>}
                </div>
                {/* No onField: your own face-down cards show at full brightness here */}
                <CardImage className="gpd-popover-card" controls={controls} card={item.card} owner={item.owner} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
