import { describe, expect, it } from "vitest";
import { DEFAULT_TAG_RULES, detectTags, normalizeForTags, suggestionForTags } from "./tagging";

describe("local movement tagging", () => {
  it("normalizes accents and repeated spaces", () => {
    expect(normalizeForTags("  PERENCIÓN   de  instancia ")).toBe("perencion de instancia");
  });

  it("detects tags without depending on accents or case", () => {
    const detections = detectTags("Se dictó SENTENCIA definitiva en la causa.");
    expect(detections.map((item) => item.label)).toEqual(["Sentencia"]);
    expect(detections[0].matches).toEqual(["sentencia"]);
  });

  it("collects every matching keyword and sorts by evidence", () => {
    const detections = detectTags("Se corrió traslado y se ordenó la prueba testimonial y documental.");
    expect(detections[0]).toMatchObject({ label: "Prueba" });
    expect(detections[0].matches).toEqual(["prueba", "testimonial", "documental"]);
    expect(detections.map((item) => item.label)).toContain("Traslado");
  });

  it("returns no tags for unrelated text", () => {
    expect(detectTags("Se agregó una nota interna sin contenido procesal.")).toEqual([]);
  });

  it("respects a custom rule set", () => {
    const detections = detectTags("Se notificó el proveído", [{ label: "Notificación", keywords: ["notificó", "proveído"] }]);
    expect(detections).toEqual([{ label: "Notificación", matches: ["notificó", "proveído"] }]);
  });

  it("suggests a template and state for the first known tag", () => {
    expect(suggestionForTags(["Desconocida", "Sentencia"])).toEqual({
      label: "Sentencia",
      template: "Presentación simple",
      state: "Sentencia",
    });
  });

  it("returns null when there is no suggestion for the detected tags", () => {
    expect(suggestionForTags(["Desconocida"], {})).toBeNull();
  });

  it("ships a non-empty default rule set", () => {
    expect(DEFAULT_TAG_RULES.length).toBeGreaterThanOrEqual(6);
    expect(DEFAULT_TAG_RULES.every((rule) => rule.label && rule.keywords.length)).toBe(true);
  });
});
