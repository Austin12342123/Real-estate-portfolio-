/* Unit tests only: the Playwright device matrix in tests/e2e runs with `playwright test`, not vitest. */
import { defineConfig, configDefaults } from 'vitest/config';
export default defineConfig({ test: { exclude: [...configDefaults.exclude, 'tests/e2e/**', 'test-results/**'] } });
