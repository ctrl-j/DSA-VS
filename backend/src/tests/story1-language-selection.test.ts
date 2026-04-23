import { describe, it, expect } from "@jest/globals";
import { LANGUAGES } from "../judge/language-config";

describe("Story 1 - Language Selection", () => {
  it("supports python, cpp, and java", () => {
    expect(LANGUAGES).toHaveProperty("python");
    expect(LANGUAGES).toHaveProperty("cpp");
    expect(LANGUAGES).toHaveProperty("java");
  });

  it("each language has image, fileName, and runCmd", () => {
    for (const lang of ["python", "cpp", "java"] as const) {
      const config = LANGUAGES[lang];
      expect(config.image).toBeTruthy();
      expect(config.fileName).toBeTruthy();
      expect(typeof config.runCmd).toBe("function");
    }
  });

  it("cpp and java have compileCmd", () => {
    expect(typeof LANGUAGES.cpp.compileCmd).toBe("function");
    expect(typeof LANGUAGES.java.compileCmd).toBe("function");
  });

  it("python does NOT have compileCmd", () => {
    expect(LANGUAGES.python.compileCmd).toBeUndefined();
    expect(LANGUAGES.python.compiled).toBe(false);
  });
});
