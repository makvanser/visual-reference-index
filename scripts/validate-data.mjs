import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const referencesData = JSON.parse(await readFile(path.join(projectRoot, 'data', 'references.json'), 'utf8'))
const familiesData = JSON.parse(await readFile(path.join(projectRoot, 'data', 'families.json'), 'utf8'))
const requiredFields = [
  'id',
  'image',
  'source_file',
  'site_name',
  'site_type',
  'family',
  'family_id',
  'description',
  'why_it_works',
  'tags',
  'colors',
  'typography',
  'layout',
  'grid',
  'spacing',
  'ui_elements',
  'notes',
]
const hexPattern = /^#[0-9A-F]{6}$/i
const errors = []

const familyById = new Map(familiesData.families.map((family) => [family.id, family]))
const ids = new Set()
const sourceFiles = new Set()
const familyCounts = new Map(familiesData.families.map((family) => [family.id, 0]))

for (const reference of referencesData.references) {
  for (const field of requiredFields) {
    if (!(field in reference)) errors.push(`${reference.id || 'unknown'}: missing ${field}`)
  }

  if (ids.has(reference.id)) errors.push(`${reference.id}: duplicate id`)
  ids.add(reference.id)

  if (sourceFiles.has(reference.source_file)) errors.push(`${reference.id}: duplicate source_file`)
  sourceFiles.add(reference.source_file)

  const family = familyById.get(reference.family_id)
  if (!family) {
    errors.push(`${reference.id}: unknown family_id ${reference.family_id}`)
  } else {
    if (family.name !== reference.family) errors.push(`${reference.id}: family name mismatch`)
    familyCounts.set(reference.family_id, (familyCounts.get(reference.family_id) || 0) + 1)
  }

  if (!Array.isArray(reference.tags) || reference.tags.length < 3 || reference.tags.length > 7) {
    errors.push(`${reference.id}: tags must contain 3 to 7 items`)
  }

  for (const color of reference.colors || []) {
    if (!hexPattern.test(color.hex)) errors.push(`${reference.id}: invalid color ${color.hex}`)
  }

  for (const directory of ['screens', path.join('public', 'screens')]) {
    try {
      await access(path.join(projectRoot, directory, reference.source_file))
    } catch {
      errors.push(`${reference.id}: missing ${directory}/${reference.source_file}`)
    }
  }

  if (reference.source_materials) {
    const materialImages = [
      reference.source_materials.cover_image,
      ...reference.source_materials.elements.flatMap((element) => [
        ...element.images,
        ...(element.videos || []),
      ]),
    ].filter(Boolean)

    for (const image of materialImages) {
      if (!image.startsWith('/materials/')) {
        errors.push(`${reference.id}: invalid material path ${image}`)
        continue
      }

      try {
        await access(path.join(projectRoot, 'public', image.slice(1)))
      } catch {
        errors.push(`${reference.id}: missing public${image}`)
      }
    }
  }
}

for (const family of familiesData.families) {
  const actualCount = familyCounts.get(family.id) || 0
  if (actualCount !== family.reference_count) {
    errors.push(`${family.id}: reference_count is ${family.reference_count}, actual ${actualCount}`)
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exit(1)
}

console.log(`Validated ${referencesData.references.length} references in ${familiesData.families.length} families.`)
