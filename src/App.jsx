import { useEffect, useMemo, useRef, useState } from 'react'
import referencesData from '../data/references.json'
import familiesData from '../data/families.json'

const references = referencesData.references
const families = familiesData.families

function assetUrl(path) {
  if (!path?.startsWith('/')) return path
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${base}${path}`
}

function markdownList(items, fallback = 'Не определяется') {
  if (!items?.length) return `- ${fallback}`
  return items.map((item) => `- ${item}`).join('\n')
}

function getMaterialCount(reference) {
  const materials = reference.source_materials
  if (!materials) return 0
  return (materials.cover_image ? 1 : 0)
    + materials.elements.reduce(
      (total, element) => total + element.images.length + (element.videos?.length || 0),
      0,
    )
}

function buildSourceMaterialsMarkdown(reference) {
  const materials = reference.source_materials
  if (!materials) return ''

  const awardScore = materials.award.score != null ? `, ${materials.award.score}/10` : ''
  const developerScore = materials.award.developer_score != null
    ? `- Developer score: ${materials.award.developer_score}/10\n`
    : ''

  const elementSections = materials.elements.map((element) => `### ${element.name}

- Источник: [Awwwards](${element.source_url})
- Подтверждённые теги: ${element.tags.join(', ')}
- Локальные изображения: ${element.images.length ? element.images.map((image) => `\`${image}\``).join(', ') : 'Нет отдельных poster-кадров'}
- Локальные видео: ${element.videos?.length ? element.videos.map((video) => `\`${video}\``).join(', ') : 'Нет'}
`).join('\n')

  return `## Проверенные материалы источника

- Источник: [${materials.source_name}](${materials.source_url})
- Официальный сайт: [${materials.live_site_url}](${materials.live_site_url})
- Дата проверки: ${materials.retrieved_at}
- Авторы: ${materials.creators.join(', ')}
- Награда: ${materials.award.name}, ${materials.award.date}${awardScore}
${developerScore}- Проверенная палитра: ${materials.verified_palette.join(', ')}
- Направления: ${materials.disciplines.join(', ')}
- Характер опыта: ${materials.experience_traits.join(', ')}
- Технологии: ${materials.technologies.join(', ')}
- Локальная обложка: \`${materials.cover_image}\`

${materials.source_summary}

${elementSections}`
}

export function buildReferenceMarkdown(reference) {
  const colors = reference.colors
    .map((color) => `| \`${color.hex}\` | ${color.role} | ${color.confidence} |`)
    .join('\n')

  return `# ${reference.site_name}

![Скриншот ${reference.site_name}](./${reference.source_file})

## Кратко

- Семья: ${reference.family}
- Тип сайта: ${reference.site_type}
- Исходный файл: \`${reference.source_file}\`
- Статус анализа: ${reference.analysis_status}

${reference.description}

## Почему дизайн работает

${reference.why_it_works}

## Теги

${markdownList(reference.tags)}

## Палитра

| HEX | Роль | Уверенность |
| --- | --- | --- |
${colors}

- Фон: ${reference.background.description}
- Цвета фона: ${reference.background.colors.join(', ')}
- Акцентные цвета: ${reference.accent_colors.join(', ') || 'Не выделяются'}

## Типографика

- Характер: ${reference.typography.style}
- Классы: ${reference.typography.font_character.join(', ') || 'Не определяются'}
- Точный шрифт: ${reference.typography.exact_font}
- Заголовки: ${reference.typography.headings}
- Основной текст: ${reference.typography.body}
- Плотность текста: ${reference.typography.text_density}

## Композиция и структура

- Композиция: ${reference.layout.composition}
- Колонки: ${reference.layout.columns}
- Whitespace: ${reference.layout.whitespace}
- Изображения: ${reference.layout.image_treatment}
- Пропорции изображений: ${reference.layout.proportions}

Структура страницы:

${markdownList(reference.layout.page_structure)}

## Сетка и отступы

- Тип сетки: ${reference.grid.type}
- Количество колонок или зон: ${reference.grid.columns}
- Выравнивание: ${reference.grid.alignment}
- Характер отступов: ${reference.spacing.character}
- Интервалы секций: ${reference.spacing.section_gap}
- Внутренние отступы: ${reference.spacing.internal_padding}

## UI-элементы

- Навигация: ${reference.ui_elements.navigation}
- Кнопки: ${reference.ui_elements.buttons}
- Controls: ${reference.ui_elements.controls}
- Рамки: ${reference.ui_elements.borders}
- Скругления: ${reference.ui_elements.radii}

## Текстуры и графика

Текстуры:

${markdownList(reference.textures)}

Графические элементы:

${markdownList(reference.graphic_elements)}

## Предполагаемая интерактивность

${markdownList(reference.inferred_interactions, 'Не определяется по статичному изображению')}

## Дополнительные заметки

${markdownList(reference.notes)}

${buildSourceMaterialsMarkdown(reference)}
`
}

function downloadReferenceMarkdown(reference) {
  const markdown = buildReferenceMarkdown(reference)
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const safeName = reference.site_name
    .toLocaleLowerCase('ru')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '') || 'reference'
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${reference.id}-${safeName}.md`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function readUrlState() {
  const params = new URLSearchParams(window.location.search)
  return {
    familyId: params.get('family') || 'all',
    query: params.get('q') || '',
    selectedId: params.get('ref') || null,
  }
}

function writeUrlState({ familyId, query, selectedId }) {
  const params = new URLSearchParams()
  if (familyId !== 'all') params.set('family', familyId)
  if (query.trim()) params.set('q', query.trim())
  if (selectedId) params.set('ref', selectedId)
  const next = params.toString()
  window.history.replaceState(null, '', next ? `?${next}` : window.location.pathname)
}

function getSearchText(reference) {
  const sourceText = reference.source_materials
    ? [
        reference.source_materials.source_name,
        reference.source_materials.source_summary,
        ...reference.source_materials.creators,
        ...reference.source_materials.disciplines,
        ...reference.source_materials.experience_traits,
        ...reference.source_materials.technologies,
        ...reference.source_materials.elements.flatMap((element) => [element.name, ...element.tags]),
      ]
    : []

  return [
    reference.site_name,
    reference.site_type,
    reference.family,
    reference.description,
    reference.why_it_works,
    ...reference.tags,
    ...sourceText,
  ]
    .join(' ')
    .toLocaleLowerCase('ru')
}

function ReferenceCard({ reference, index, onOpen }) {
  const visibleTags = reference.tags.slice(0, 3)
  const hiddenTagCount = Math.max(0, reference.tags.length - visibleTags.length)
  const materialCount = getMaterialCount(reference)

  return (
    <article className="reference-card">
      <button
        className="reference-card__button"
        type="button"
        onClick={() => onOpen(reference.id)}
        aria-label={`Открыть референс ${reference.site_name}`}
      >
        <span className="reference-card__image-frame">
          <img
            className="reference-card__image"
            src={assetUrl(reference.image)}
            alt={`Скриншот: ${reference.site_name}`}
            loading={index < 4 ? 'eager' : 'lazy'}
            decoding="async"
          />
        </span>
        <span className="reference-card__meta">
          <span className="reference-card__title">{reference.site_name}</span>
          <span className="reference-card__family">{reference.family}</span>
          {materialCount > 0 && (
            <span className="reference-card__source">
              {reference.source_materials.source_name} · {materialCount} материалов
            </span>
          )}
          <span className="tag-row" aria-label="Основные теги">
            {visibleTags.map((tag) => (
              <span className="tag" key={tag}>
                {tag}
              </span>
            ))}
            {hiddenTagCount > 0 && <span className="tag tag--count">+{hiddenTagCount}</span>}
          </span>
        </span>
      </button>
      <button
        className="reference-card__export"
        type="button"
        onClick={() => downloadReferenceMarkdown(reference)}
        aria-label={`Скачать описание ${reference.site_name} в Markdown`}
      >
        Скачать .md
      </button>
    </article>
  )
}

function ColorSwatches({ colors }) {
  return (
    <div className="swatches">
      {colors.map((color) => (
        <div className="swatch" key={`${color.hex}-${color.role}`}>
          <span
            className="swatch__color"
            style={{ backgroundColor: color.hex }}
            aria-hidden="true"
          />
          <span className="swatch__hex">{color.hex}</span>
          <span className="swatch__role">{color.role}</span>
        </div>
      ))}
    </div>
  )
}

function DetailItem({ label, children, wide = false }) {
  return (
    <div className={wide ? 'detail-item detail-item--wide' : 'detail-item'}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function SourceGallery({ materials, siteName }) {
  const galleryItems = [
    ...(materials.cover_image
      ? [{ image: materials.cover_image, label: 'Awwwards cover' }]
      : []),
    ...materials.elements.flatMap((element) => element.images.map((image, index) => ({
      image,
      label: element.images.length > 1
        ? `${element.name} ${index + 1}/${element.images.length}`
        : element.name,
      type: 'image',
    }))),
    ...materials.elements.flatMap((element) => (element.videos || []).map((video) => ({
      video,
      poster: element.images[0],
      label: `${element.name} · motion`,
      type: 'video',
    }))),
  ]

  return (
    <section className="source-gallery" aria-labelledby="source-gallery-heading">
      <div className="source-gallery__heading">
        <h3 id="source-gallery-heading">Материалы Awwwards</h3>
        <span>{galleryItems.length} материалов</span>
      </div>
      <div className="source-gallery__grid">
        {galleryItems.map((item) => (
          <figure className="source-gallery__item" key={item.image || item.video}>
            {item.type === 'video' ? (
              <video controls muted playsInline preload="metadata" poster={assetUrl(item.poster)}>
                <source src={assetUrl(item.video)} type="video/mp4" />
              </video>
            ) : (
              <img
                src={assetUrl(item.image)}
                alt={`${siteName}: ${item.label}`}
                loading="lazy"
                decoding="async"
              />
            )}
            <figcaption>{item.label}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}

function SourceMaterials({ materials }) {
  return (
    <section className="modal-section source-materials" aria-labelledby="source-materials-heading">
      <div className="source-materials__heading">
        <div>
          <p>Проверенный источник</p>
          <h3 id="source-materials-heading">{materials.source_name}</h3>
        </div>
        <div className="source-materials__links">
          <a href={materials.source_url} target="_blank" rel="noreferrer">Страница проекта</a>
          <a href={materials.live_site_url} target="_blank" rel="noreferrer">Официальный сайт</a>
        </div>
      </div>

      <p className="source-materials__summary">{materials.source_summary}</p>

      <dl className="source-facts">
        <div>
          <dt>Награда</dt>
          <dd>
            {materials.award.name}
            {materials.award.score != null && ` · ${materials.award.score}/10`}
          </dd>
        </div>
        <div>
          <dt>Дата</dt>
          <dd>{materials.award.date}</dd>
        </div>
        <div>
          <dt>Авторы</dt>
          <dd>{materials.creators.join(', ')}</dd>
        </div>
        <div>
          <dt>Технологии</dt>
          <dd>{materials.technologies.join(', ')}</dd>
        </div>
      </dl>

      <div className="source-elements">
        {materials.elements.map((element) => (
          <article className="source-element" key={element.name}>
            <div className="source-element__title">
              <a href={element.source_url} target="_blank" rel="noreferrer">{element.name}</a>
              <span>{element.images.length + (element.videos?.length || 0)} медиа</span>
            </div>
            <div className="tag-row">
              {element.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function ReferenceModal({ reference, position, total, onClose, onPrevious, onNext }) {
  const closeButtonRef = useRef(null)
  const previousFocusRef = useRef(null)

  useEffect(() => {
    previousFocusRef.current = document.activeElement
    closeButtonRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
      previousFocusRef.current?.focus?.()
    }
  }, [])

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft') onPrevious()
      if (event.key === 'ArrowRight') onNext()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, onNext, onPrevious])

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reference-modal-title"
      >
        <header className="modal__header">
          <span className="modal__position">
            {String(position + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </span>
          <div className="modal__controls" aria-label="Навигация по референсам">
            <button type="button" onClick={onPrevious}>Предыдущий</button>
            <button type="button" onClick={onNext}>Следующий</button>
            <button ref={closeButtonRef} type="button" onClick={onClose}>Закрыть</button>
          </div>
        </header>

        <div className="modal__body">
          <div className="modal__media">
            <img src={assetUrl(reference.image)} alt={`Увеличенный скриншот: ${reference.site_name}`} />
            {reference.source_materials && (
              <SourceGallery materials={reference.source_materials} siteName={reference.site_name} />
            )}
          </div>

          <div className="modal__content">
            <div className="modal__intro">
              <p className="modal__family">{reference.family}</p>
              <h2 id="reference-modal-title">{reference.site_name}</h2>
              <p className="modal__type">{reference.site_type}</p>
              <p className="modal__why">{reference.why_it_works}</p>
            </div>

            <div className="tag-row tag-row--full">
              {reference.tags.map((tag) => (
                <span className="tag" key={tag}>{tag}</span>
              ))}
            </div>

            {reference.source_materials && <SourceMaterials materials={reference.source_materials} />}

            <section className="modal-section" aria-labelledby="palette-heading">
              <h3 id="palette-heading">Основные цвета</h3>
              <ColorSwatches colors={reference.colors} />
            </section>

            <dl className="detail-grid">
              <DetailItem label="Типографика">
                {reference.typography.style}. {reference.typography.headings}
              </DetailItem>
              <DetailItem label="Шрифт">
                {reference.typography.exact_font}
              </DetailItem>
              <DetailItem label="Сетка">
                {reference.grid.type}; {reference.grid.columns} колонок или зон. {reference.grid.alignment}.
              </DetailItem>
              <DetailItem label="Композиция">
                {reference.layout.composition}
              </DetailItem>
              <DetailItem label="Отступы">
                {reference.spacing.character}; {reference.spacing.section_gap}; внутри {reference.spacing.internal_padding}.
              </DetailItem>
              <DetailItem label="Whitespace">
                {reference.layout.whitespace}
              </DetailItem>
              <DetailItem label="Изображения">
                {reference.layout.image_treatment}. Пропорции: {reference.layout.proportions}.
              </DetailItem>
              <DetailItem label="Текст">
                Плотность: {reference.typography.text_density}. Основной текст: {reference.typography.body}.
              </DetailItem>
              <DetailItem label="Навигация">
                {reference.ui_elements.navigation}
              </DetailItem>
              <DetailItem label="Кнопки и controls">
                {reference.ui_elements.buttons}. {reference.ui_elements.controls}.
              </DetailItem>
              <DetailItem label="Рамки и радиусы">
                {reference.ui_elements.borders}. Радиусы: {reference.ui_elements.radii}.
              </DetailItem>
              <DetailItem label="Текстуры и графика">
                {[...reference.textures, ...reference.graphic_elements].join(', ') || 'Не определяются'}
              </DetailItem>
              <DetailItem label="Структура страницы" wide>
                {reference.layout.page_structure.join(', ') || 'Не определяется'}
              </DetailItem>
              <DetailItem label="Предполагаемая интерактивность" wide>
                {reference.inferred_interactions.join(', ') || 'Не определяется по статичному изображению'}
              </DetailItem>
              <DetailItem label="Дополнительные заметки" wide>
                {reference.notes.join(' ')}
              </DetailItem>
            </dl>
          </div>
        </div>
      </section>
    </div>
  )
}

export default function App() {
  const initialUrlState = useMemo(readUrlState, [])
  const [familyId, setFamilyId] = useState(initialUrlState.familyId)
  const [query, setQuery] = useState(initialUrlState.query)
  const [selectedId, setSelectedId] = useState(initialUrlState.selectedId)

  const familyCounts = useMemo(() => {
    const counts = new Map(families.map((family) => [family.id, 0]))
    references.forEach((reference) => {
      counts.set(reference.family_id, (counts.get(reference.family_id) || 0) + 1)
    })
    return counts
  }, [])

  const filteredReferences = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ru')
    return references.filter((reference) => {
      const matchesFamily = familyId === 'all' || reference.family_id === familyId
      const matchesSearch = !normalizedQuery || getSearchText(reference).includes(normalizedQuery)
      return matchesFamily && matchesSearch
    })
  }, [familyId, query])

  const selectedReference = useMemo(
    () => references.find((reference) => reference.id === selectedId) || null,
    [selectedId],
  )

  const modalSequence = useMemo(() => {
    if (!selectedReference) return filteredReferences
    return filteredReferences.some((reference) => reference.id === selectedReference.id)
      ? filteredReferences
      : references
  }, [filteredReferences, selectedReference])

  const modalPosition = selectedReference
    ? Math.max(0, modalSequence.findIndex((reference) => reference.id === selectedReference.id))
    : 0

  useEffect(() => {
    writeUrlState({ familyId, query, selectedId })
  }, [familyId, query, selectedId])

  useEffect(() => {
    function handlePopState() {
      const next = readUrlState()
      setFamilyId(next.familyId)
      setQuery(next.query)
      setSelectedId(next.selectedId)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  function showRelativeReference(delta) {
    if (!selectedReference || modalSequence.length === 0) return
    const nextIndex = (modalPosition + delta + modalSequence.length) % modalSequence.length
    setSelectedId(modalSequence[nextIndex].id)
  }

  return (
    <div className="app-shell">
      <header className="catalog-header">
        <div className="catalog-header__topline">
          <div>
            <p className="catalog-kicker">Visual Reference Index</p>
            <h1>Архив визуальных систем</h1>
          </div>
          <p className="family-total">{families.length} style families</p>
        </div>

        <div className="filter-panel">
          <nav className="family-filters" aria-label="Фильтр по семьям стилей">
            <button
              className={familyId === 'all' ? 'filter-button is-active' : 'filter-button'}
              type="button"
              onClick={() => setFamilyId('all')}
            >
              All <span>· {references.length}</span>
            </button>
            {families.map((family) => (
              <button
                className={familyId === family.id ? 'filter-button is-active' : 'filter-button'}
                type="button"
                key={family.id}
                onClick={() => setFamilyId(family.id)}
              >
                {family.name} <span>· {familyCounts.get(family.id)}</span>
              </button>
            ))}
          </nav>

          <label className="search-field">
            <span>Поиск</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Сайт, тег, описание, семья"
            />
          </label>
        </div>
      </header>

      <main>
        <div className="results-line" aria-live="polite">
          <span>{filteredReferences.length} из {references.length}</span>
          <span>{familyId === 'all' ? 'Все семьи' : families.find((family) => family.id === familyId)?.name}</span>
        </div>

        {filteredReferences.length > 0 ? (
          <section className="reference-grid" aria-label="Каталог референсов">
            {filteredReferences.map((reference, index) => (
              <ReferenceCard
                reference={reference}
                index={index}
                key={reference.id}
                onOpen={setSelectedId}
              />
            ))}
          </section>
        ) : (
          <section className="empty-state">
            <h2>Ничего не найдено</h2>
            <p>Сбросьте фильтр или измените поисковый запрос.</p>
            <button
              type="button"
              onClick={() => {
                setFamilyId('all')
                setQuery('')
              }}
            >
              Показать весь архив
            </button>
          </section>
        )}
      </main>

      {selectedReference && (
        <ReferenceModal
          reference={selectedReference}
          position={modalPosition}
          total={modalSequence.length}
          onClose={() => setSelectedId(null)}
          onPrevious={() => showRelativeReference(-1)}
          onNext={() => showRelativeReference(1)}
        />
      )}
    </div>
  )
}
