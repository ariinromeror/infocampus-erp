import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: {
      react,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      // El patron `catch {}` silencioso (sin variable) se usa de forma
      // intencional en varios lugares para ignorar errores no criticos.
      'no-empty': ['error', { allowEmptyCatch: true }],
      // Sin esta regla, identificadores usados solo como componente JSX
      // (p.ej. `const Icon = icon; <Icon />`) se reportan como falsos
      // positivos de no-unused-vars, ya que espree no marca los
      // JSXIdentifier como referencias por defecto.
      'react/jsx-uses-vars': 'error',
      // Reglas de eslint-plugin-react-hooks (v7) recien adoptadas que
      // requieren revision manual caso por caso antes de forzarlas como
      // error (varias ya existían en produccion antes de este cambio).
      // Se degradan a warning temporalmente; ver docs/DEPLOY.md.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      // AuthContext.jsx exporta el componente AuthProvider y el hook
      // useAuth desde el mismo archivo; separarlos es un refactor de
      // mayor alcance (actualizar todos los imports de useAuth). Se
      // degrada a warning en vez de bloquear CI; ver docs/DEPLOY.md.
      'react-refresh/only-export-components': 'warn',
    },
  },
])
