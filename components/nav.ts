// Main pages, shared by the header, the phone tab bar's More sheet and the footer.
// (A plain module, so both server and browser components can read it.)

export const NAV = [
  { href: "/doctors", label: "Doctors" },
  { href: "/services", label: "Services" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
] as const;
