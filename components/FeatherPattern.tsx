// Decorative background for the home hero: the feathered wings from the logo, very faint.
// Purely visual (aria-hidden); text on top keeps full contrast.

const FEATHERS = [
  "M194 128 C160 100 112 90 64 104 C92 132 146 150 194 152 Z",
  "M194 156 C162 136 118 130 80 142 C108 166 154 178 194 180 Z",
  "M194 184 C168 168 134 166 104 178 C128 198 164 206 194 206 Z",
];

export function FeatherPattern({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="40 70 320 160" aria-hidden="true" className={`pointer-events-none absolute text-brand ${className}`}>
      <g fill="currentColor">
        {FEATHERS.map((d, i) => (
          <path key={d} d={d} opacity={0.5 - i * 0.12} />
        ))}
        <g transform="matrix(-1 0 0 1 400 0)">
          {FEATHERS.map((d, i) => (
            <path key={d} d={d} opacity={0.5 - i * 0.12} />
          ))}
        </g>
      </g>
    </svg>
  );
}
