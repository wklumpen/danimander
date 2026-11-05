import { useEffect } from "react";
import { track } from "../analytics";
import { checked, info, type Source } from "../content/info";

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

      <h2>{info.actTitle}</h2>
      <ul>
        {info.act.map((a) => (
          <li key={a.text}>{a.url ? <a href={a.url} target="_blank" rel="noopener noreferrer">{a.text}</a> : a.text}</li>
        ))}
      </ul>

      <p className="muted small">{info.checkedNote(checked)}</p>
      <p className="muted small">{info.analytics}</p>
      <button className="link" onClick={onBack}>{info.back}</button>
    </article>
  );
}
