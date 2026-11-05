import { track } from "../analytics";
import { share as copy } from "../content/share";
import { svgToPng } from "./shareCard";

/** Secondary share: save the result card as a PNG (the text result is the main share). */
export function ShareButtons({ svg }: { svg: string; link?: string }) {
  const download = async () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(await svgToPng(svg));
    a.download = copy.filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    track("share-download");
  };
  return (
    <div className="share">
      <button onClick={download}>⬇️ {copy.buttons.download}</button>
    </div>
  );
}
