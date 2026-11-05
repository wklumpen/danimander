// Every factual claim about Alberta lives here, each with its source(s), so the whole page
// can be fact-checked in one place. `checked` = date the source was last opened and read.
// Items with `verify` need a human check before launch (see note on each).

export type Source = { label: string; url: string };
export type Item = { text: string; sources: Source[]; verify?: string };
export type Dated = Item & { date: string };

const S = {
  bill31: { label: "Government of Alberta — Bill 31 fact sheet (Dec 2024)", url: "https://www.alberta.ca/system/files/jus-fact-sheet-bill-31-justice-statutes-amendment-act.pdf" },
  global2024: { label: "Global News — Nov 5, 2024", url: "https://globalnews.ca/news/10852992/alberta-legislature-seats/" },
  ctv2024: { label: "CTV News — Bill 31", url: "https://ctvnews.ca/edmonton/article/bill-31-to-add-2-new-ridings-to-alberta" },
  statute: { label: "Justice Statutes Amendment Act, 2024, SA 2024 c 17 (CanLII)", url: "https://canlii.ca/t/56dnf" },
  ebcPage: { label: "Elections Alberta — Electoral Boundaries Commissions", url: "https://www.elections.ab.ca/resources/reports/electoral-boundaries-commission/" },
  interim: { label: "Commission interim report (Oct 2025)", url: "https://www.elections.ab.ca/uploads/2025-Interim-Report-Original.pdf" },
  final: { label: "Commission final report (Mar 2026)", url: "https://www.elections.ab.ca/uploads/abebc_2026_rpt_final.pdf" },
  ablawg: { label: "ABlawg — The Minority Report on Electoral Districts (Apr 13, 2026)", url: "https://ablawg.ca/2026/04/13/the-minority-report-on-electoral-districts-will-the-law-protect-alberta-from-ucp-gerrymandering/" },
  appointees: { label: "Sherwood Park News — commission appointees (Apr 2025)", url: "https://www.sherwoodparknews.com/news/judge-to-lead-commission-to-redraw-boundaries-prior-to-next-alberta-election" },
  ucpStatement: { label: "United Conservative Caucus statement (Apr 16, 2026)", url: "https://unitedconservativecaucus.ca/statement-on-the-electoral-boundaries-commission-report-2/" },
  herald: { label: "Lethbridge Herald — Apr 30, 2026", url: "https://lethbridgeherald.com/news/lethbridge-news/2026/04/30/ndp-accuses-ucp-of-gerrymandering-over-electoral-boundaries/" },
  ssceb: { label: "Select Special Committee on Electoral Boundaries — report (Nov 2026), incl. text of Motion 37", url: "https://www.assembly.ab.ca/docs/default-source/committees/ceb/ssceb-report-(original-signed).pdf?sfvrsn=e847491d_8" },
  ceo: { label: "Global News — Elections Alberta letter (Oct 31, 2026)", url: "https://globalnews.ca/news/12128904/possible-delayed-albert-election/" },
  cbcDenied: { label: "CBC News — Province denies Elections Alberta's request", url: "https://www.cbc.ca/news/canada/edmonton/elections-alberta-mickey-amery-9.7405056" },
} satisfies Record<string, Source>;

export const checked = "2026-11-05";

export const info = {
  title: "It's a game here. In Alberta, it's real.",
  back: "← Back to the game",
  sixtyTitle: "The 60-second version",
  receiptsTitle: "The receipts",

  sixty: [
    { icon: "⚖️", text: "Alberta's ridings are normally drawn by an independent commission chaired by a judge.", anchor: "timeline" },
    { icon: "🗑️", text: "In April 2026 the government set the commission's final report aside — a first in Alberta's history.", anchor: "card-toss" },
    { icon: "🏛️", text: "It gave the job to an MLA committee with a government majority, with no requirement to hold public hearings.", anchor: "card-hearings" },
    { icon: "➕", text: "The commission drew 89 ridings; the committee's panel was told to draw 91.", anchor: "card-seat" },
    { icon: "⏳", text: "Elections Alberta asked MLAs to keep the current map or delay the 2027 vote.", anchor: "timeline" },
  ],

  timeline: [
    {
      date: "Nov–Dec 2024",
      text: "Bill 31 tells the next commission to draw 89 ridings (up from 87) and removes the expectation that ridings follow municipal boundaries and Calgary/Edmonton community boundaries where possible. It passes in December.",
      sources: [S.bill31, S.global2024, S.ctv2024, S.statute],
      verify: "Confirm the municipal/community-boundary wording against the statute text (CanLII blocked automated fetch; the government fact sheet only says the factors were 'updated and clarified').",
    },
    {
      date: "Mar 28, 2025",
      text: "The Electoral Boundaries Commission is established: a judge as chair, two members nominated by the government and two by the Opposition.",
      sources: [S.final, S.ebcPage],
    },
    {
      date: "Spring 2025 – Jan 2026",
      text: "The commission holds 30 public hearings before its interim report, takes 198 written submissions, then 1,147 more on the interim report, plus another round of hearings in January 2026.",
      sources: [S.final],
    },
    {
      date: "Oct 2025",
      text: "The commission's interim report is submitted with unanimous support.",
      sources: [S.interim, S.ablawg],
    },
    {
      date: "Mar 23, 2026",
      text: "The final report arrives with a majority report (the chair and the two Opposition nominees) and a minority report from the two government-nominated members, John Evans and Julian Martin. The chair adds an addendum suggesting 91 seats if the Legislature won't accept the majority map.",
      sources: [S.final, S.appointees, S.ablawg],
      verify: "The final report lists members but not who nominated whom; nominator attribution comes from news coverage.",
    },
    {
      date: "Apr 16–21, 2026",
      text: "The government sets the report aside. Government Motion 37 passes on April 21: it creates a select committee to oversee a new review 'on an expedited basis' and 'without a requirement to direct the holding of public hearings', and urges a bill for 91 ridings.",
      sources: [S.ssceb, S.ucpStatement, S.herald],
    },
    {
      date: "Jun 2–9, 2026",
      text: "The committee (four government MLAs, two Opposition) appoints a five-person advisory panel: a chair and two members nominated by the Premier, two nominated by the Opposition Leader. Its mandate: 91 ridings.",
      sources: [S.ssceb],
    },
    {
      date: "Oct 22–30, 2026",
      text: "The panel delivers its report. Alberta's chief electoral officer writes to MLAs asking them to either keep the current boundaries or postpone the October 2027 election, citing the time needed to implement a new map.",
      sources: [S.ssceb, S.ceo],
    },
    {
      date: "Nov 2026",
      text: "The committee reports to the Legislature; the two Opposition members file minority observations. The justice minister says the election date won't change.",
      sources: [S.ssceb, S.cbcDenied, S.ceo],
    },
    {
      date: "What's next",
      text: "The new map only becomes law if the Legislature passes it. The next general election is scheduled for October 2027.",
      sources: [S.ceo],
    },
  ] satisfies Dated[],

  facts: [
    {
      text: "Alberta law allows ridings to vary from the average population by up to 25%, and up to four sparse ridings to fall as much as 50% below.",
      sources: [S.ablawg],
    },
    {
      text: "The commission's majority called the minority's map 'unconstitutional' and warned it would 'invite a court to write the next chapter'.",
      sources: [S.ablawg, S.final],
    },
    {
      text: "The commission itself said it could have used more seats: had it been allowed, it 'may very well have proposed a map of at least 91 electoral divisions'.",
      sources: [S.final],
    },
  ] satisfies Item[],

  rationaleTitle: "The government's case, in its own words",
  rationale: [
    {
      text: "The governing caucus said its new process would \"ensure effective representation as guaranteed by the Canadian Charter of Rights and Freedoms\", and pointed to the commission majority's own view that more seats would have given \"more effective representation\".",
      sources: [S.ucpStatement],
      verify: "Quotes captured via an automated reader — confirm verbatim against the statement before launch.",
    },
  ] satisfies Item[],

  powersTitle: "The power cards in real life",
  powers: [
    { id: "card-seat", card: "➕ Bonus Seat", text: "The number of ridings is set by the Legislature, not the commission: 87 → 89 by Bill 31 in 2024, then a push to 91 through Motion 37 in 2026.", sources: [S.bill31, S.ssceb] },
    { id: "card-limits", card: "🚧 Erase the City Limits", text: "Bill 31 (2024) stopped asking the commission to respect municipal boundaries where possible.", sources: [S.ctv2024, S.statute], verify: "Same as the Nov–Dec 2024 timeline item." },
    { id: "card-hearings", card: "🔇 Skip the Hearings", text: "Motion 37 told the new committee to work 'without a requirement to direct the holding of public hearings'. The commission held dozens.", sources: [S.ssceb, S.final] },
    { id: "card-toss", card: "🗑️ Toss the Ref's Report", text: "The government set aside the independent commission's final report — reported as the first time in Alberta's history.", sources: [S.herald, S.ssceb] },
  ],

  builtTitle: "How the game was built",
  built: [
    "Worlds 1–2 are made-up boards. Every possible fair-sized, connected map was counted by computer so the 'X% of maps' numbers are exact.",
    "Districts win by most votes. Vote totals never change in the game — only lines.",
    "'Tiles moved' compares your map to the original after matching districts up, so renaming a district doesn't count as a change.",
  ],
  repo: { label: "Source code and data", url: "https://github.com/wklumpen/danimander" },

  actTitle: "What you can do",
  act: [
    { text: "Find your MLA and tell them who should draw the map.", url: "https://www.assembly.ab.ca/members/members-of-the-legislative-assembly", verify: "Confirm URL." },
    { text: "Share the game with someone who'd never read a news story about this.", url: null },
  ],

  checkedNote: (d: string) => `Sources last checked ${d}. Spotted an error? Tell us and we'll fix it.`,
  analytics: "We count visits and level completions. No cookies, no personal data, no tracking across sites.",
};
