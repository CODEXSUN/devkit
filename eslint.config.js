import js from "@eslint/js";
import { registerHooks } from "node:module";

const eslintCompilerUrl = import.meta.resolve("typescript-eslint-compiler");
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "typescript") return { shortCircuit: true, url: eslintCompilerUrl };
    return nextResolve(specifier, context);
  }
});

const [{ default: tsParser }, { default: tsPlugin }] = await Promise.all([
  import("@typescript-eslint/parser"),
  import("@typescript-eslint/eslint-plugin")
]);

export default [
  { ignores: ["dist/**", "node_modules/**"] },
  js.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { parser: tsParser, parserOptions: { ecmaVersion: "latest", sourceType: "module" } },
    plugins: { "@typescript-eslint": tsPlugin },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      "no-undef": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }]
    }
  }
];
