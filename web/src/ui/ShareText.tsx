import { useState } from "react";
import { track } from "../analytics";
import { share as copy } from "../content/share";
import { shareOrCopy } from "../game/shareText";

/** The paste-into-WhatsApp result: preview + one big Share button (copies when sharing isn't available). */
export function ShareText({ text, event }: { text: string; event: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="share">
      <pre className="share-text" aria-label="Your result">{text}</pre>
      <button
        className="primary"
        onClick={async () => {
          const r = await shareOrCopy(text);
          if (r === "copied") setMsg(copy.copiedText);
          if (r === "failed") setMsg(null);
          if (r === "shared" || r === "copied") track(`${event}-${r}`);
        }}
      >
        📤 {copy.buttons.native}
      </button>
      {msg && <p className="muted small" role="status">{msg}</p>}
    </div>
  );
}
