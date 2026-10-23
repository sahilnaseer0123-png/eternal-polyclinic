import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanAnalyticsUrl } from "../lib/analytics";

test("search words never reach the visitor stats", () => {
  assert.equal(cleanAnalyticsUrl("https://x.app/doctors?q=depression"), "https://x.app/doctors");
  assert.equal(cleanAnalyticsUrl("https://x.app/doctors?q=back+pain&type=brain"), "https://x.app/doctors?type=brain");
});

test("page-naming parameters and plain paths are kept; the hash is dropped", () => {
  assert.equal(cleanAnalyticsUrl("https://x.app/book?doctor=akash"), "https://x.app/book?doctor=akash");
  assert.equal(cleanAnalyticsUrl("https://x.app/doctors/akash"), "https://x.app/doctors/akash");
  assert.equal(cleanAnalyticsUrl("https://x.app/#book-akash"), "https://x.app/");
  assert.equal(cleanAnalyticsUrl("https://x.app/book?doctor=akash&utm_source=wa&name=Aamir"), "https://x.app/book?doctor=akash");
});
