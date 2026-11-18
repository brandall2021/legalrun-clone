import { describe, expect, it } from "vitest";
import { extractTemplateVariables, insertTemplateVariable, renderTemplate } from "./templateEngine";

describe("template engine", () => {
  it("extracts unique variables in order of appearance", () => {
    const body = "Hola {{claimant}}, expediente {{number}}. Saluda {{claimant}} ante {{ court }}.";
    expect(extractTemplateVariables(body)).toEqual(["claimant", "number", "court"]);
  });

  it("ignores braces that are not template variables", () => {
    expect(extractTemplateVariables("Texto {simple} y {{}} y {{ no valido }}")).toEqual([]);
  });

  it("renders known values and reports missing ones without dropping the token", () => {
    const result = renderTemplate("Hola {{claimant}} del expediente {{number}} en {{court}}.", {
      claimant: "  Empresa Demo S.A. ",
      number: "1842/2025",
      court: "   ",
    });

    expect(result.text).toBe("Hola Empresa Demo S.A. del expediente 1842/2025 en {{court}}.");
    expect(result.missing).toEqual(["court"]);
  });

  it("inserts a variable at the selection and returns the new caret", () => {
    const result = insertTemplateVariable("Hola , todo bien.", "claimant", 5, 5);
    expect(result.body).toBe("Hola {{claimant}}, todo bien.");
    expect(result.caret).toBe(5 + "{{claimant}}".length);
  });

  it("replaces the selected text when inserting a variable", () => {
    const result = insertTemplateVariable("Hola NOMBRE, todo bien.", "claimant", 5, 11);
    expect(result.body).toBe("Hola {{claimant}}, todo bien.");
  });
});
