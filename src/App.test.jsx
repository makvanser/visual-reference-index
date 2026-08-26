import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import App, { buildReferenceMarkdown } from './App.jsx'
import referencesData from '../data/references.json'

describe('Visual Reference Index', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/')
  })

  test('renders the complete indexed catalogue', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Архив визуальных систем' })).toBeInTheDocument()
    expect(screen.getByText('8 style families')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Открыть референс/ })).toHaveLength(30)
    expect(screen.getAllByRole('button', { name: /Скачать описание/ })).toHaveLength(30)
    expect(screen.getAllByText('Awwwards · 9 материалов')).toHaveLength(2)
    expect(screen.getByText('Awwwards · 12 материалов')).toBeInTheDocument()
    expect(screen.getAllByText('Awwwards · 13 материалов')).toHaveLength(2)
    expect(screen.getByText('Awwwards · 19 материалов')).toBeInTheDocument()
    expect(screen.getByText('Awwwards · 17 материалов')).toBeInTheDocument()
    expect(screen.getByText('Awwwards · 21 материалов')).toBeInTheDocument()
    expect(screen.getByText('Awwwards · 8 материалов')).toBeInTheDocument()
    expect(screen.getByText('Awwwards · 16 материалов')).toBeInTheDocument()
  })

  test('builds a complete Markdown export for a reference', () => {
    const markdown = buildReferenceMarkdown(referencesData.references[5])

    expect(markdown).toContain('# Opal')
    expect(markdown).toContain('## Палитра')
    expect(markdown).toContain('## Типографика')
    expect(markdown).toContain('## Композиция и структура')
    expect(markdown).toContain('## UI-элементы')
    expect(markdown).toContain('380b059e0ae966ca5df0be4cbb42b862.jpg')
  })

  test('downloads the full reference analysis as a Markdown file', async () => {
    const user = userEvent.setup()
    const createObjectURL = vi.fn(() => 'blob:reference-markdown')
    const revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL })

    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Скачать описание Opal в Markdown' }))

    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(createObjectURL.mock.calls[0][0]).toBeInstanceOf(Blob)
    expect(click).toHaveBeenCalledOnce()
    expect(click.mock.instances[0].download).toBe('ref-006-opal.md')
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:reference-markdown')
    click.mockRestore()
  })

  test('includes verified Awwwards materials in the Nothin reference and Markdown', async () => {
    const user = userEvent.setup()
    const nothin = referencesData.references.find((reference) => reference.id === 'ref-022')
    const markdown = buildReferenceMarkdown(nothin)

    expect(markdown).toContain('## Проверенные материалы источника')
    expect(markdown).toContain('Site of the Day, 2026-08-10, 7.45/10')
    expect(markdown).toContain('Hero Shaders')
    expect(markdown).toContain('/materials/ref-022/attractive-3d.jpg')

    render(<App />)
    await user.click(screen.getByRole('button', { name: "Открыть референс Nothin'" }))

    expect(screen.getByRole('heading', { name: 'Awwwards' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Страница проекта' })).toHaveAttribute(
      'href',
      'https://www.awwwards.com/sites/nothin',
    )
    expect(document.querySelectorAll('.source-gallery__item')).toHaveLength(9)
  })

  test('includes Mosby Files source materials and local motion previews', async () => {
    const user = userEvent.setup()
    const mosby = referencesData.references.find((reference) => reference.id === 'ref-021')
    const markdown = buildReferenceMarkdown(mosby)

    expect(markdown).toContain("# Mosby's Files")
    expect(markdown).toContain('Site of the Day, 2026-08-13, 7.23/10')
    expect(markdown).toContain('/materials/ref-021/page-scroll.mp4')
    expect(markdown).toContain('Reveal Animation & Hero Navigation')

    render(<App />)
    await user.click(screen.getByRole('button', { name: "Открыть референс Mosby's Files" }))

    expect(screen.getByRole('link', { name: 'Страница проекта' })).toHaveAttribute(
      'href',
      'https://www.awwwards.com/sites/mosbys-files',
    )
    expect(document.querySelectorAll('.source-gallery__item')).toHaveLength(12)
    expect(document.querySelectorAll('.source-gallery__item video')).toHaveLength(5)
  })

  test('includes Illoca source materials without inventing an award score', async () => {
    const user = userEvent.setup()
    const illoca = referencesData.references.find((reference) => reference.id === 'ref-023')
    const markdown = buildReferenceMarkdown(illoca)

    expect(markdown).toContain('# Illoca')
    expect(markdown).toContain('Honorable Mention, 2026-07-29')
    expect(markdown).not.toContain('null/10')
    expect(markdown).toContain('WebGL')
    expect(markdown).toContain('/materials/ref-023/interactive-blocks.mp4')

    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Открыть референс Illoca' }))

    expect(screen.getByRole('link', { name: 'Страница проекта' })).toHaveAttribute(
      'href',
      'https://www.awwwards.com/sites/illoca',
    )
    expect(screen.getByText('Honorable Mention')).toBeInTheDocument()
    expect(document.querySelectorAll('.source-gallery__item')).toHaveLength(13)
    expect(document.querySelectorAll('.source-gallery__item video')).toHaveLength(5)
  })

  test('includes the complete Benorth Studio source set and Markdown export', async () => {
    const user = userEvent.setup()
    const benorth = referencesData.references.find((reference) => reference.id === 'ref-024')
    const markdown = buildReferenceMarkdown(benorth)

    expect(markdown).toContain('# BeNorth Studio')
    expect(markdown).toContain('Honorable Mention, 2026-07-27')
    expect(markdown).not.toContain('null/10')
    expect(markdown).toContain('Next.js')
    expect(markdown).toContain('/materials/ref-024/shop-03.png')

    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Открыть референс BeNorth Studio' }))

    expect(screen.getByRole('link', { name: 'Страница проекта' })).toHaveAttribute(
      'href',
      'https://www.awwwards.com/sites/benorth-studio-brand-studio',
    )
    expect(screen.getByText('Honorable Mention')).toBeInTheDocument()
    expect(document.querySelectorAll('.source-gallery__item')).toHaveLength(19)
    expect(document.querySelectorAll('.source-gallery__item video')).toHaveLength(0)
  })

  test.each([
    {
      id: 'ref-025',
      title: 'Kononenko Architectural Bureau',
      sourceUrl: 'https://www.awwwards.com/sites/kononenko-architectural-bureau',
      asset: '/materials/ref-025/hover-animation.mp4',
      materialCount: 17,
    },
    {
      id: 'ref-026',
      title: 'Eladio Dieste',
      sourceUrl: 'https://www.awwwards.com/sites/eladio-dieste',
      asset: '/materials/ref-026/gallery-parallax.mp4',
      materialCount: 13,
    },
    {
      id: 'ref-027',
      title: 'NORMAL IS BORING',
      sourceUrl: 'https://www.awwwards.com/sites/normal-is-boring',
      asset: '/materials/ref-027/gallery-projects.jpg',
      materialCount: 9,
    },
    {
      id: 'ref-028',
      title: 'ERA Residence',
      sourceUrl: 'https://www.awwwards.com/sites/era-residence',
      asset: '/materials/ref-028/day-night-theme.mp4',
      materialCount: 21,
    },
    {
      id: 'ref-029',
      title: 'THE RED',
      sourceUrl: 'https://www.awwwards.com/sites/the-red',
      asset: '/materials/ref-029/webgl-interaction.mp4',
      materialCount: 8,
    },
    {
      id: 'ref-030',
      title: 'Mara',
      sourceUrl: 'https://www.awwwards.com/sites/mara',
      asset: '/materials/ref-030/product-page-02.jpg',
      materialCount: 16,
    },
  ])('indexes the complete source set for $title', ({ id, title, sourceUrl, asset, materialCount }) => {
    const reference = referencesData.references.find((item) => item.id === id)
    const markdown = buildReferenceMarkdown(reference)
    const indexedMaterialCount =
      1 +
      reference.source_materials.elements.reduce(
        (total, element) => total + (element.images?.length ?? 0) + (element.videos?.length ?? 0),
        0,
      )

    expect(reference.family_id).toBe('architectural-editorial')
    expect(reference.source_materials.source_url).toBe(sourceUrl)
    expect(indexedMaterialCount).toBe(materialCount)
    expect(markdown).toContain(`# ${title}`)
    expect(markdown).toContain(sourceUrl)
    expect(markdown).toContain(asset)
    expect(markdown).not.toContain('null/10')
  })

  test('opens a new architecture reference with its local source gallery', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Открыть референс ERA Residence' }))

    expect(screen.getByRole('link', { name: 'Страница проекта' })).toHaveAttribute(
      'href',
      'https://www.awwwards.com/sites/era-residence',
    )
    expect(document.querySelector('.modal__family')).toHaveTextContent('Architectural Editorial')
    expect(document.querySelectorAll('.source-gallery__item')).toHaveLength(21)
    expect(document.querySelectorAll('.source-gallery__item video')).toHaveLength(8)
  })

  test('filters by family without a reload and syncs the URL', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /Architectural Editorial/ }))

    expect(screen.getAllByRole('button', { name: /Открыть референс/ })).toHaveLength(10)
    await waitFor(() => {
      expect(window.location.search).toContain('family=architectural-editorial')
    })
  })

  test('searches site names and keeps the query in the URL', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByRole('searchbox', { name: 'Поиск' }), 'Opal')

    expect(screen.getByRole('button', { name: 'Открыть референс Opal' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Открыть референс/ })).toHaveLength(1)
    await waitFor(() => {
      expect(window.location.search).toContain('q=Opal')
    })
  })

  test('supports modal navigation, outside click and Escape', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Открыть референс Opal' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Opal' })).toBeInTheDocument()

    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('heading', { name: 'Velora' })).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Открыть референс Opal' }))
    const overlay = document.querySelector('.modal-overlay')
    fireEvent.mouseDown(overlay, { target: overlay })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
