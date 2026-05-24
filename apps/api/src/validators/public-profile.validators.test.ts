import test from "node:test";
import assert from "node:assert/strict";
import { createContactLeadBodySchema, savePublicProfileBodySchema, searchLibrariesQuerySchema } from "./public-profile.validators";

test("searchLibrariesQuerySchema parses amenities and nearby search flags", () => {
  const parsed = searchLibrariesQuerySchema.parse({
    city: "Indore",
    amenities: "AC, WiFi, Girls Only Zone",
    availableOnly: "true",
    lat: "22.7196",
    lng: "75.8577",
    radiusKm: "5",
  });

  assert.deepEqual(parsed.amenities, ["AC", "WiFi", "Girls Only Zone"]);
  assert.equal(parsed.availableOnly, true);
  assert.equal(parsed.lat, 22.7196);
  assert.equal(parsed.lng, 75.8577);
  assert.equal(parsed.radiusKm, 5);
});

test("savePublicProfileBodySchema enforces normalized subdomain and defaults", () => {
  const parsed = savePublicProfileBodySchema.parse({
    subdomain: "focuslibrary",
    heroTitle: "Focused reading hall in Vijay Nagar for exam aspirants",
    addressText: "Plot 21, Vijay Nagar, Indore",
  });

  assert.equal(parsed.subdomain, "focuslibrary");
  assert.equal(parsed.showInMarketplace, true);
  assert.equal(parsed.allowDirectContact, true);
  assert.deepEqual(parsed.amenities, []);
});

test("createContactLeadBodySchema accepts whatsapp tracking payload", () => {
  const parsed = createContactLeadBodySchema.parse({
    channel: "WHATSAPP",
    sourcePage: "LIBRARY_SITE",
    studentName: "Riya Sharma",
    metadata: { ref: "cta-button" },
  });

  assert.equal(parsed.channel, "WHATSAPP");
  assert.equal(parsed.sourcePage, "LIBRARY_SITE");
  assert.deepEqual(parsed.metadata, { ref: "cta-button" });
});
