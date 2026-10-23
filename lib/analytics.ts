// What the visitor stats may see of a page address. Searches like /doctors?q=depression can say
// something about a person's health, so every query parameter is dropped except the two that only
// name a page view: ?type= (speciality chip) and ?doctor= (booking link). The hash is dropped too.

const KEEP = new Set(["type", "doctor"]);

export function cleanAnalyticsUrl(href: string): string {
  const url = new URL(href);
  for (const key of [...url.searchParams.keys()]) if (!KEEP.has(key)) url.searchParams.delete(key);
  url.hash = "";
  return url.toString();
}
