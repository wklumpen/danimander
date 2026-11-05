import { daily } from "../content/howto";

/** "The Daily Danimander", with "Dani" in Government blue. */
export function DailyBrand({ n }: { n?: number }) {
  return (
    <span className="daily-brand">
      {daily.brand.the}
      <span className="dani">{daily.brand.dani}</span>
      {daily.brand.rest}
      {n !== undefined && <span className="daily-num"> #{n}</span>}
    </span>
  );
}
