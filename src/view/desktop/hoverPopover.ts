import { createContext, useContext, type PointerEvent } from "react";
import type { GameQueries } from "../../app/useGameController";
import type { CardView, PlayerView } from "../../model/game/views";

/** One card in the popover, with the small label drawn above it. Plain data, no game logic. */
export interface PopoverItem {
  card: CardView;
  /** The player whose hand or field holds the card (CardImage decides from this which face shows). */
  owner: PlayerView;
  label: string;
  /** A second label line ("triggers first"). */
  note?: string;
  /** Draws the label in orange. */
  accent?: boolean;
}

export interface PopoverContent {
  items: readonly PopoverItem[];
  /** "side": beside the anchor (field tiles). "above": over it (hand cards). */
  placement: "side" | "above";
}

export interface OpenPopover {
  /** The hovered element. Its rect is read for placement only, once the popover opens. */
  anchor: HTMLElement;
  content: PopoverContent;
}

/**
 * The one hover popover on the page: a single timer and what is open. It lives outside React state, so
 * opening and closing re-render only the popover layer (which subscribes), never the board.
 */
export interface HoverPopoverStore {
  /** Opens after the hover delay, replacing any pending open. */
  schedule: (anchor: HTMLElement, content: PopoverContent) => void;
  /** Opens now. */
  show: (anchor: HTMLElement, content: PopoverContent) => void;
  /** Cancels a pending open and closes. Does nothing when nothing is open. */
  hide: () => void;
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => OpenPopover | null;
}

export const HOVER_DELAY_MS = 300;

export function createHoverPopoverStore(): HoverPopoverStore {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let open: OpenPopover | null = null;
  const listeners = new Set<() => void>();

  const set = (next: OpenPopover | null) => {
    if (open === next) return;
    open = next;
    listeners.forEach(listener => listener());
  };
  const clearTimer = () => {
    clearTimeout(timer);
    timer = undefined;
  };

  return {
    schedule: (anchor, content) => {
      clearTimer();
      timer = setTimeout(() => {
        timer = undefined;
        set({ anchor, content });
      }, HOVER_DELAY_MS);
    },
    show: (anchor, content) => {
      clearTimer();
      set({ anchor, content });
    },
    hide: () => {
      clearTimer();
      set(null);
    },
    subscribe: listener => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    getSnapshot: () => open,
  };
}

export const HoverPopoverContext = createContext<HoverPopoverStore | null>(null);

/**
 * The content to show, or null when the viewer can see none of the cards (an opponent's face-down
 * pair), so nothing opens. Visibility comes from the same query CardImage uses.
 */
export function popoverContent(queries: GameQueries, placement: PopoverContent["placement"], items: readonly PopoverItem[]): PopoverContent | null {
  return items.some(item => queries.isCardVisibleToPlayer(item.card, item.owner)) ? { items, placement } : null;
}

/**
 * Pointer handlers that open `content` after hovering the element for HOVER_DELAY_MS, with a mouse only
 * (touch and pen never open it). Spread them on the element the popover should sit next to.
 */
export function useHoverPopover(content: PopoverContent | null) {
  const store = useContext(HoverPopoverContext);
  if (!store || !content) return {};
  return {
    onPointerEnter: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType === "mouse") store.schedule(event.currentTarget, content);
    },
    onPointerLeave: () => store.hide(),
  };
}

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

/**
 * Where the popover's top-left corner goes, in the layer's coordinates (the same as client coordinates:
 * the layer covers the fixed desktop shell). `size` includes the popover's transparent halo, which is the
 * gap to the anchor and to the window's edge, so nothing here needs a pixel constant.
 * - side: right of the anchor if it fits, else left of it if that fits, else on the roomier side,
 *   clamped into the window. Vertically centred on the anchor, clamped.
 * - above: centred over the anchor, clamped into the window.
 */
export function placePopover(anchor: Box, size: { width: number; height: number }, bounds: { width: number; height: number }, placement: PopoverContent["placement"]) {
  const maxX = bounds.width - size.width;
  const maxY = bounds.height - size.height;
  const anchorRight = anchor.left + anchor.width;

  if (placement === "above") {
    return {
      x: clamp(anchor.left + anchor.width / 2 - size.width / 2, 0, maxX),
      y: clamp(anchor.top - size.height, 0, maxY),
    };
  }

  const left = anchor.left - size.width;
  let x: number;
  if (anchorRight <= maxX) x = anchorRight;
  else if (left >= 0) x = left;
  else x = bounds.width - anchorRight >= anchor.left ? anchorRight : left;

  return {
    x: clamp(x, 0, maxX),
    y: clamp(anchor.top + anchor.height / 2 - size.height / 2, 0, maxY),
  };
}
