// Cartoon illustration of the clinic for the hero, until a real photo arrives.

export function ClinicIllustration() {
  return (
    <svg viewBox="0 0 480 380" role="img" aria-label="Illustration of Eternal Polyclinic" className="block h-auto w-full">
      <rect width="480" height="380" fill="#F0FDFA" />
      <circle cx="404" cy="74" r="30" fill="#FDE68A" />
      <ellipse cx="96" cy="76" rx="44" ry="16" fill="#FFFFFF" />
      <ellipse cx="128" cy="64" rx="28" ry="16" fill="#FFFFFF" />
      <ellipse cx="330" cy="46" rx="34" ry="12" fill="#FFFFFF" />
      <path d="M0 300c80-34 160-34 240-10s160 26 240-6v96H0z" fill="#CCFBF1" />
      <rect x="132" y="132" width="216" height="190" rx="12" fill="#FFFFFF" stroke="#0F766E" strokeWidth="3" />
      <rect x="118" y="108" width="244" height="40" rx="12" fill="#0F766E" />
      <text
        x="240"
        y="134"
        textAnchor="middle"
        fontSize="16"
        fontWeight="700"
        fill="#FFFFFF"
        letterSpacing="1.5"
        fontFamily="Plus Jakarta Sans Variable, system-ui, sans-serif"
      >
        ETERNAL POLYCLINIC
      </text>
      <circle cx="240" cy="184" r="24" fill="#F0FDFA" stroke="#0F766E" strokeWidth="3" />
      <rect x="234" y="170" width="12" height="28" rx="2" fill="#0F766E" />
      <rect x="226" y="178" width="28" height="12" rx="2" fill="#0F766E" />
      {[
        [152, 164],
        [282, 164],
        [152, 228],
        [282, 228],
      ].map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="46" height="38" rx="6" fill="#CCFBF1" stroke="#0F766E" strokeWidth="2.5" />
      ))}
      <rect x="212" y="236" width="56" height="86" rx="8" fill="#0F766E" />
      <circle cx="256" cy="282" r="3.5" fill="#FDE68A" />
      <rect x="198" y="320" width="84" height="10" rx="4" fill="#99F6E4" />
      <rect x="84" y="264" width="10" height="44" rx="4" fill="#92400E" />
      <circle cx="89" cy="250" r="34" fill="#5EEAD4" />
      <circle cx="74" cy="236" r="16" fill="#2DD4BF" />
      <rect x="398" y="276" width="9" height="36" rx="4" fill="#92400E" />
      <circle cx="402" cy="262" r="28" fill="#5EEAD4" />
      <circle cx="356" cy="292" r="9" fill="#E8B98F" />
      <path d="M346 290c0-7 4-11 10-11s10 4 10 11c-2-4-5-5-10-5s-8 1-10 5z" fill="#1F2937" />
      <path d="M342 340c0-20 6-36 14-36s14 16 14 36z" fill="#FFFFFF" stroke="#0F766E" strokeWidth="2" />
    </svg>
  );
}
