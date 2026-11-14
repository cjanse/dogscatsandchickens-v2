import type { ReactNode } from "react";
import { useHoverPopover, type PopoverContent } from "./hoverPopover";

/**
 * A wrapper that opens the hover popover for `content` (null: never). For elements that can't take pointer
 * handlers themselves, such as the shared CardImage. The wrapper is what the popover is placed against.
 * `onClick` goes on the wrapper, so a click anywhere in its hit area (padding, a hit extender) counts.
 */
export function PopoverAnchor({ content, className, onClick, children }: {
  content: PopoverContent | null;
  className?: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  return <div className={className} onClick={onClick} {...useHoverPopover(content)}>{children}</div>;
}
