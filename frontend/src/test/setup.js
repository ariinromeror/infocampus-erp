import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Vitest no expone `afterEach` como global salvo que `test.globals: true` esté
// activado (no lo está aquí para evitar contaminar el linter con globals
// implícitos), así que el auto-cleanup de Testing Library no se dispara solo:
// hay que registrarlo explícitamente o el DOM se acumula entre tests.
afterEach(() => {
    cleanup();
});
