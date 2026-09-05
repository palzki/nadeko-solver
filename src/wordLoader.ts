import { load } from 'js-yaml'

export type WordEntry = {
  word: string
  displayWord: string
  imageUrl?: string
}

export type WordCategory = 'general' | 'movies' | 'countries' | 'anime' | 'things' | 'animals'

const files: Record<Exclude<WordCategory, 'general'>, string> = {
  movies: 'movies.yml',
  countries: 'countries.yml',
  anime: 'anime.yml',
  things: 'things.yml',
  animals: 'animals.yml',
}

function normalizeWord(value: string): string {
  return value.toLowerCase().replace(/[^a-z]+/g, ' ').trim()
}

export async function loadWordCategories(): Promise<Record<WordCategory, WordEntry[]>> {
  const entries = await Promise.all(Object.entries(files).map(async ([category, file]) => {
    const response = await fetch(`${import.meta.env.BASE_URL}data/${file}`)
    if (!response.ok) throw new Error(`Unable to load ${file}`)

    const parsed = load(await response.text())
    if (!Array.isArray(parsed)) throw new Error(`${file} must contain a YAML list`)

    const words = parsed
      .filter((entry): entry is { word: unknown; imageUrl?: unknown } => typeof entry === 'object' && entry !== null && 'word' in entry)
      .map((entry) => ({
        word: normalizeWord(String(entry.word)),
        displayWord: String(entry.word).trim(),
        imageUrl: typeof entry.imageUrl === 'string' ? entry.imageUrl : undefined,
      }))
      .filter((entry) => entry.word.length > 0)

    return [category as WordCategory, words] as const
  }))

  const categories = Object.fromEntries(entries) as Record<Exclude<WordCategory, 'general'>, WordEntry[]>
  const general = [...new Map(Object.values(categories).flat().map((entry) => [entry.word, entry])).values()]

  return { general, ...categories }
}
