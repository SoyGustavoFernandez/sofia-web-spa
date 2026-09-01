// eslint.config.js (Fast pre-commit linting config)
const eslint = require("@eslint/js");
const tseslint = require("typescript-eslint");
const tsParser = require("@typescript-eslint/parser");
const prettierPlugin = require("eslint-plugin-prettier");
const unusedImportsPlugin = require("eslint-plugin-unused-imports");

const angularTemplate = require("@angular-eslint/eslint-plugin-template");
const templateParser = require("@angular-eslint/template-parser");

// Toggle de type-aware (OFF por defecto; CI lo enciende)
const TYPE_AWARE = process.env.ESLINT_TYPEAWARE === "true";

module.exports = tseslint.config(
  {
    files: [
      "src/app/pages/**/*.ts",
      "src/app/shared/**/*.ts",
    ],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        sourceType: "module",
        // Si TYPE_AWARE=true (p.ej., en CI), carga tsconfig y hace análisis con tipos
        project: TYPE_AWARE ? ["./tsconfig.json"] : undefined,
        tsconfigRootDir: __dirname
      },
    },
    plugins: {
      prettier: prettierPlugin,
      "unused-imports": unusedImportsPlugin
    },
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,   // sin type-aware si TYPE_AWARE=false
      ...tseslint.configs.stylistic
    ],
    rules: {
      // Limpieza de imports/vars automáticas
      "no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        { vars: "all", varsIgnorePattern: "^_", args: "after-used", argsIgnorePattern: "^_" }
      ],
      "@typescript-eslint/no-explicit-any": "error"
    },
  },
  {
    files: ["src/app/matdash/**/*.ts"],
    ignores: [
      "src/app/matdash/**/*.ts"
    ],
    rules: {},
  },
  {
    files: [
      "src/app/pages/**/*.html",
      "src/app/shared/**/*.html"
    ],
    languageOptions: {
      parser: templateParser,              // clave para evitar “Unexpected token <”
    },
    plugins: {
      "@angular-eslint/template": angularTemplate,
    },
    rules: {
      ...angularTemplate.configs.recommended.rules,
    },
  },
  // Ignores globales
  {
    ignores: [
      "dist",
      "coverage",
      "node_modules",
      "**/*.generated.ts",
      "**/environments/**",
      "**/*.d.ts",
      "src/app/matdash/**"
    ],
  }
);
