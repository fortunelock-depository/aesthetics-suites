import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    '.next/**',
    // Verification builds (NEXT_DIST_DIR) - same artifacts, different dir.
    '.next-verify/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Prisma-generated client (regenerated on build).
    'generated/**',
  ]),
]);

export default eslintConfig;
