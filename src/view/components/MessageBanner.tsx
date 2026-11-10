import type { CSSProperties } from "react";

/** Shows why the last action failed. Renders nothing when there is no message. */
export function MessageBanner({ message, onDismiss, style }: {
  message: string | null;
  onDismiss: () => void;
  style?: CSSProperties;
}) {
  if (message === null) return null;

  return (
    <div
      role="alert"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 8px",
        backgroundColor: "#fff3cd",
        color: "#664d03",
        border: "1px solid #e0c060",
        borderRadius: 4,
        ...style,
      }}
    >
      <span style={{ flex: 1 }}>{message}</span>
      <button
        onClick={onDismiss}
        aria-label="Dismiss message"
        style={{ border: "none", background: "none", cursor: "pointer", padding: 0, font: "inherit", color: "inherit" }}
      >
        ×
      </button>
    </div>
  );
}
