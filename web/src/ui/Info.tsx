import { useEffect, useState } from "react";
import { track } from "../analytics";
import { checked, info, type Source } from "../content/info";
import { share } from "../content/share";
import { copyText, shareOrCopy } from "../game/shareText";

function Sources({ sources }: { sources: Source[] }) {
  return (
    <span className="sources">
      {sources.map((s, i) => (
        <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" title={s.label}>
          [{i + 1}]
        </a>
      ))}
    </span>
  );
}

export function Info({ onBack }: { onBack: () => void }) {
  const [done, setDone] = useState<string | null>(null);
  useEffect(() => {
    track("info-view");
    window.scrollTo(0, 0);
  }, []);
  return (
    <article className="info">
      <button className="link" onClick={onBack}>{info.back}</button>
      <h1>{info.title}</h1>

      <h2>{info.sixtyTitle}</h2>
      <ol className="sixty">
        {info.sixty.map((f) => (
          <li key={f.text}>
            <span className="ic" aria-hidden>{f.icon}</span>
            <a href={`#${f.anchor}`} onClick={() => track("receipts-open")}>{f.text}</a>
          </li>
        ))}
      </ol>

      <h2>{info.receiptsTitle}</h2>
      <ol className="timeline" id="timeline">
        {info.timeline.map((e) => (
          <li key={e.date}>
            <b>{e.date}</b> {e.text} <Sources sources={e.sources} />
          </li>
        ))}
      </ol>

      <ul className="facts">
        {info.facts.map((f) => (
          <li key={f.text}>
            {f.text} <Sources sources={f.sources} />
          </li>
        ))}
      </ul>

      <h2>{info.powersTitle}</h2>
      {info.powers.map((p) => (
        <p key={p.id} id={p.id}>
          <b>{p.card}</b> — {p.text} <Sources sources={p.sources} />
        </p>
      ))}

      <h2>{info.builtTitle}</h2>
      <ul>
        {info.built.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>

      <h2 id="act">{info.actTitle}</h2>
      <p className="not-alone">
        {info.notAlone.text} <Sources sources={info.notAlone.sources} />
      </p>
      <div className="act">
        {info.act.map((a) => (
          <section key={a.id} className="act-card">
            <h3>
              <span aria-hidden>{a.icon}</span> {a.title}
            </h3>
            <p>{a.text}</p>
            {"message" in a && a.message && <blockquote className="mla-message">{a.message}</blockquote>}
            <div className="act-actions">
              {a.id === "share" && (
                <button
                  className="primary"
                  onClick={async () => {
                    const r = await shareOrCopy(`${share.text.replace(/\s*danimander\.ca\s*$/, "")} ${location.origin}${location.pathname}`);
                    if (r === "shared" || r === "copied") track(`act-share-${r}`);
                    if (r === "copied") setDone("share");
                  }}
                >
                  {done === "share" ? info.copied : a.button}
                </button>
              )}
              {"message" in a && a.message && (
                <button
                  className="primary"
                  onClick={async () => {
                    if (await copyText(a.message!)) setDone(a.id);
                    track("act-mla-copy");
                  }}
                >
                  {done === a.id ? info.copied : a.button}
                </button>
              )}
              {"link" in a && a.link && (
                <a href={a.link.url} target="_blank" rel="noopener noreferrer" onClick={() => track(`act-${a.id}`)}>
                  {a.linkLabel}
                </a>
              )}
            </div>
          </section>
        ))}
      </div>

      <p className="muted small">{info.checkedNote(checked)}</p>
      <p className="muted small">{info.analytics}</p>
      <button className="link" onClick={onBack}>{info.back}</button>
    </article>
  );
}
