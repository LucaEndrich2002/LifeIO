import { describe, expect, it } from "vitest";
import { profileSchema } from "@/domain/profile";

const valid = {
  display_name: "Alex",
  time_zone: "Europe/Berlin",
  currency: "EUR",
};
describe("profile validation", () => {
  it("accepts an explicit time zone and trims the display name", () => {
    expect(profileSchema.parse({ ...valid, display_name: " Alex " })).toEqual(
      valid,
    );
  });
  it.each(["", "  ", "x".repeat(81)])(
    "rejects an unusable display name",
    (display_name) => {
      expect(profileSchema.safeParse({ ...valid, display_name }).success).toBe(
        false,
      );
    },
  );
  it.each(["invalid", "+01:00", "CET", ""])(
    "requires an IANA zone, not an implicit offset or abbreviation",
    (time_zone) => {
      expect(profileSchema.safeParse({ ...valid, time_zone }).success).toBe(
        false,
      );
    },
  );
  it.each(["UTC", "Europe/Berlin", "America/New_York"])(
    "accepts supported time zones",
    (time_zone) => {
      expect(profileSchema.safeParse({ ...valid, time_zone }).success).toBe(
        true,
      );
    },
  );
  it("rejects a different currency and drops client-supplied ownership", () => {
    expect(profileSchema.safeParse({ ...valid, currency: "USD" }).success).toBe(
      false,
    );
    expect(profileSchema.parse({ ...valid, user_id: "someone-else" })).toEqual(
      valid,
    );
  });
});
