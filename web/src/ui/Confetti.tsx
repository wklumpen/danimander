const COLORS = ["#762a83", "#1b7837", "#ffb000", "#c2a5cf", "#a6dba0"];

export function Confetti() {
  return (
    <div className="confetti" aria-hidden>
      {Array.from({ length: 28 }, (_, i) => (
        <i
          key={i}
          style={{
            left: `${(i * 37) % 100}%`,
            background: COLORS[i % COLORS.length],
            animationDelay: `${(i % 7) * 0.05}s`,
            ["--dx" as string]: `${((i * 53) % 120) - 60}px`,
          }}
        />
      ))}
    </div>
  );
}
