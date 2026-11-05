import { splash } from "../content/splash";

export function shouldShowSplash(): boolean {
  try {
    return !localStorage.getItem("dm:splash");
  } catch {
    return true;
  }
}

export function Splash({ onClose }: { onClose: () => void }) {
  const close = () => {
    try {
      localStorage.setItem("dm:splash", "1");
    } catch {
      // storage disabled: show again next time, no harm
    }
    onClose();
  };
  return (
    <div className="overlay center" role="dialog" aria-label={splash.title}>
      <div className="splash">
        <svg className="splash-mascot" viewBox="0 0 24 24" aria-hidden><use href="#ic-salamander" /></svg>
        <h1>{splash.title}</h1>
        <p className="tagline">{splash.tagline}</p>
        {splash.lines.map((l) => (
          <p key={l}>{l}</p>
        ))}
        <button className="primary" onClick={close} autoFocus>{splash.go}</button>
        <p className="muted small">
          {splash.footnote}{" "}
          <a href="#info" onClick={close}>→</a>
        </p>
        <p className="muted small">{splash.analytics}</p>
      </div>
    </div>
  );
}
