import { build } from 'vite'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { mkdirSync, copyFileSync } from 'fs'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const outDir = resolve(__dirname, 'dist/content-scripts')
const iconsOutDir = resolve(__dirname, 'dist/icons')

mkdirSync(outDir, { recursive: true })
mkdirSync(iconsOutDir, { recursive: true })

for (const size of [16, 32, 48, 128]) {
  copyFileSync(resolve(__dirname, `icons/icon-${size}.png`), resolve(iconsOutDir, `icon-${size}.png`))
}

for (const name of ['anilist', 'mal', 'crunchyroll']) {
  await build({
    configFile: false,
    publicDir: false,
    build: {
      outDir,
      emptyOutDir: false,
      lib: {
        entry: resolve(__dirname, `src/content-scripts/${name}.ts`),
        name: 'MiruImport',
        fileName: () => `${name}.js`,
        formats: ['iife'],
      },
    },
    logLevel: 'warn',
  })
}

copyFileSync(resolve(__dirname, 'manifest.json'), resolve(__dirname, 'dist/manifest.json'))
console.log('Extension built in extension/dist/')
