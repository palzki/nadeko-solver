export type Candidate = {
  word: string
  score: number
  nextLetters: string[]
}

const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('')

export function cleanPattern(value: string): string {
  return value.toLowerCase().replace(/[^a-z_?\s]/g, '').replace(/\?/g, '_').trim()
}

export function solve(pattern: string, wrong: string, words: readonly string[], allowCombinations = true): Candidate[] {
  const normalizedPattern = cleanPattern(pattern)
  const knownLetters = new Set(normalizedPattern.match(/[a-z]/g) ?? [])
  const wrongLetters = new Set(wrong.toLowerCase().match(/[a-z]/g) ?? [])

  if (!normalizedPattern.length) return []

  const tokens = normalizedPattern.split(/\s+/).filter(Boolean)
  const patterns = tokens.some((token) => token.length > 1)
    ? tokens.map((token) => token.replace(/\s+/g, ''))
    : normalizedPattern.split(/\s{2,}/).map((wordPattern) => wordPattern.replace(/\s+/g, '')).filter(Boolean)
  const phraseCandidates = words
    .filter((word) => word.includes(' '))
    .filter((word) => {
      const wordParts = word.split(' ')
      return wordParts.length === patterns.length && wordParts.every((wordPart, index) => wordPart.length === patterns[index].length && [...patterns[index]].every((letter, letterIndex) => letter === '_' || wordPart[letterIndex] === letter))
    })
    .filter((word) => ![...wrongLetters].some((letter) => word.includes(letter)))
    .map((word) => {
      const nextLetters = alphabet.filter((letter) => word.includes(letter) && !knownLetters.has(letter) && !wrongLetters.has(letter))
      const score = nextLetters.reduce((total, letter) => total + word.split(letter).length - 1, 0)
      return { word, score, nextLetters }
    })
  const matchesByPattern = patterns.map((wordPattern) => words
    .filter((word) => !word.includes(' '))
    .filter((word) => word.length === wordPattern.length)
    .filter((word) => ![...wrongLetters].some((letter) => word.includes(letter)))
    .filter((word) => [...wordPattern].every((letter, index) => letter === '_' || word[index] === letter))
    .map((word) => {
      const nextLetters = alphabet.filter((letter) => word.includes(letter) && !knownLetters.has(letter) && !wrongLetters.has(letter))
      const score = nextLetters.reduce((total, letter) => total + word.split(letter).length - 1, 0)
      return { word, score, nextLetters }
    }))

  if (matchesByPattern.some((matches) => !matches.length) && !phraseCandidates.length) return []

  const combinations = !allowCombinations && patterns.length === 1
    ? matchesByPattern[0].map((match) => ({ ...match }))
    : !allowCombinations || matchesByPattern.some((matches) => !matches.length) ? [] : matchesByPattern.reduce<Candidate[][]>((combinations, matches) => combinations.flatMap((combination) => matches.map((match) => {
    const nextLetters = [...new Set([...combination.flatMap((item) => item.nextLetters), ...match.nextLetters])].sort()
    return [...combination, { ...match, nextLetters }]
  })).slice(0, 200), [[]]).map((combination) => ({
    word: combination.map((match) => match.word).join(' '),
    score: combination.reduce((total, match) => total + match.score, 0),
    nextLetters: [...new Set(combination.flatMap((match) => match.nextLetters))].sort(),
  }))

  return [...phraseCandidates, ...combinations]
    .sort((left, right) => right.score - left.score || left.word.localeCompare(right.word))
}

export function letterFrequency(candidates: Candidate[]): { letter: string; count: number }[] {
  const counts = new Map<string, number>()
  candidates.forEach(({ nextLetters }) => {
    nextLetters.forEach((letter) => counts.set(letter, (counts.get(letter) ?? 0) + 1))
  })
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 5)
    .map(([letter, count]) => ({ letter, count }))
}
