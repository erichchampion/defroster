import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // Firebase Cloud Functions is a separate package with its own
      // package.json, tsconfig and lint setup; it is linted independently.
      "functions/**",
      // Node CommonJS build scripts and config that legitimately use require().
      "scripts/**",
      "jest.config.js",
    ],
  },
];

export default eslintConfig;
