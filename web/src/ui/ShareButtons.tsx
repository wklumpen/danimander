import { useState } from "react";
import { track } from "../analytics";
import { share as copy } from "../content/share";
import { svgToPng } from "./shareCard";

// Share text without the bare domain, for when the real link is attached separately.
const textOnly = copy.text.replace(/\s*danimander\.ca\s*$/, "");

export function ShareButtons({ svg, link }: { svg: string; link: string }) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const native = async () => {
    setBusy(true);
    try {
      const file = new File([await svgToPng(svg)], copy.filename, { type: "image/png" });
      const data = { files: [file], text: textOnly, url: link };
      if (navigator.canShare?.(data)) {
        await navigator.share(data);
        track("share-native");
      } else if (navigator.share) {
        await navigator.share({ text: textOnly, url: link });
        track("share-native");
      } else {
        await download();
      }
    } catch {
      // user cancelled the share sheet; nothing to do
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(await svgToPng(svg));
    a.download = copy.filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    track("share-download");
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${textOnly} ${link}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      track("share-copy");
    } catch {
      window.prompt(copy.buttons.copy, link);
    }
  };

  return (
    <div className="share">
      <img className="card-preview" alt="" src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} />
      <button className="primary" onClick={native} disabled={busy}>📤 {copy.buttons.native}</button>
      <div className="row">
        <button onClick={download}>⬇️ {copy.buttons.download}</button>
        <button onClick={copyLink}>🔗 {copied ? copy.buttons.copied : copy.buttons.copy}</button>
      </div>
    </div>
  );
}
