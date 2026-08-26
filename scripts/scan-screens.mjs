import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceDirectory = path.join(projectRoot, 'screens')
const publicDirectory = path.join(projectRoot, 'public', 'screens')
const referencesPath = path.join(projectRoot, 'data', 'references.json')
const pendingPath = path.join(projectRoot, 'data', 'pending-analysis.json')
const supportedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif'])

await mkdir(sourceDirectory, { recursive: true })
await mkdir(publicDirectory, { recursive: true })

const sourceFiles = (await readdir(sourceDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && supportedExtensions.has(path.extname(entry.name).toLowerCase()))
  .map((entry) => entry.name)
  .sort((a, b) => a.localeCompare(b, 'ru'))

const referencesData = JSON.parse(await readFile(referencesPath, 'utf8'))
const indexedFiles = new Set(referencesData.references.map((reference) => reference.source_file))

for (const sourceFile of sourceFiles) {
  await copyFile(path.join(sourceDirectory, sourceFile), path.join(publicDirectory, sourceFile))
}

const pendingFiles = sourceFiles
  .filter((sourceFile) => !indexedFiles.has(sourceFile))
  .map((sourceFile) => ({
    source_file: sourceFile,
    analysis_status: 'needs-visual-analysis',
    instruction: 'Проанализировать изображение и добавить полную запись в data/references.json. Скрипт не выполняет vision-анализ.',
  }))

const missingSources = referencesData.references
  .filter((reference) => !sourceFiles.includes(reference.source_file))
  .map((reference) => reference.source_file)

await writeFile(
  pendingPath,
  `${JSON.stringify({ schema_version: 1, pending: pendingFiles }, null, 2)}\n`,
  'utf8',
)

console.log(`Scanned: ${sourceFiles.length}`)
console.log(`Synced to public/screens: ${sourceFiles.length}`)
console.log(`Pending visual analysis: ${pendingFiles.length}`)

if (missingSources.length > 0) {
  console.warn(`Referenced files missing from screens: ${missingSources.join(', ')}`)
  process.exitCode = 1
}
