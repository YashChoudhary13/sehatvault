import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/.next/**",
      "**/dist/**",
      "**/.turbo/**",
      "**/node_modules/**",
      "**/next-env.d.ts",
      "supabase/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);
