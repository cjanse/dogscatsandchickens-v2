import type { ReactNode } from "react";
import { useHoverPopover, type PopoverContent } from "./hoverPopover";

/**
 * A wrapper that opens the hover popover for `content` (null: never). For elements that can't take pointer
 * handlers themselves, such as the shared CardImage. The wrapper is what the popover is placed against.
 */
export function PopoverAnchor({ content, className, children }: {
  content: PopoverContent | null;
  className?: string;
  children: ReactNode;
}) {
  return <div className={className} {...useHoverPopover(content)}>{children}</div>;
}
