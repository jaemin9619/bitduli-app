import assert from "node:assert/strict";
import test from "node:test";
import {
  ALLOWED_FEELINGS,
  normalizeFeeling,
  normalizeProfileColorHex,
  requireDiaryText,
  requireEmail
} from "../src/validation.js";

test("requireEmail rejects unauthenticated requests", () => {
  assert.throws(
    () => requireEmail({ auth: null }),
    (error) => error.code === "unauthenticated"
  );
});

test("requireDiaryText rejects missing and one-character text", () => {
  for (const value of [undefined, "", "가"]) {
    assert.throws(
      () => requireDiaryText(value),
      (error) => error.code === "invalid-argument"
    );
  }
});

test("requireDiaryText trims text to 4,000 characters", () => {
  assert.equal(requireDiaryText(`  ${"가".repeat(4001)}  `).length, 4000);
});

test("normalizeFeeling accepts the supported values and defaults when omitted", () => {
  assert.equal(normalizeFeeling(undefined), "Happy");
  for (const feeling of ALLOWED_FEELINGS) {
    assert.equal(normalizeFeeling(feeling), feeling);
  }
});

test("normalizeFeeling rejects unsupported values", () => {
  for (const value of ["Normal", "", 1]) {
    assert.throws(
      () => normalizeFeeling(value),
      (error) => error.code === "invalid-argument"
    );
  }
});

test("normalizeProfileColorHex accepts #RRGGBB and defaults when omitted", () => {
  assert.equal(normalizeProfileColorHex(undefined), "#FFF275");
  assert.equal(normalizeProfileColorHex("#a1b2c3"), "#A1B2C3");
});

test("normalizeProfileColorHex rejects malformed colors", () => {
  for (const value of ["FFF275", "#FFF", "#GGF275", "#FFF27500", 1]) {
    assert.throws(
      () => normalizeProfileColorHex(value),
      (error) => error.code === "invalid-argument"
    );
  }
});
