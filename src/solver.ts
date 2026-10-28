export type Candidate = {
  word: string
  score: number
  nextLetters: string[]
}

const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('')

// Hangman reveals every copy of a guessed letter, so a blank can never hide a letter already on the board.
function fitsPattern(word: string, wordPattern: string, knownLetters: Set<string>): boolean {
  return [...wordPattern].every((letter, index) => letter === '_' ? !knownLetters.has(word[index]) : word[index] === letter)
}

export function cleanPattern(value: string): string {
  return value.toLowerCase()
    .replace(/(\s*)[^a-z0-9_?\s](\s*)/g, (_match: string, before: string, after: string) => {
      if (before.length > 1 || after.length > 1) return '  '
      return before || after ? ' ' : ''
    })
    .replace(/\?/g, '_')
    .trim()
}

// Splits a board into one pattern per word. Boards are either "_a__e_ ___" or Nadeko's "_ a _ _ e _   _ _ _".
export function boardWords(pattern: string): string[] {
  const normalizedPattern = cleanPattern(pattern)
  const tokens = normalizedPattern.split(/\s+/).filter(Boolean)
  const wordPatterns = tokens.some((token) => token.length > 1)
    ? tokens
    : normalizedPattern.split(/\s{2,}/).map((wordPattern) => wordPattern.replace(/\s+/g, '')).filter(Boolean)

  return wordPatterns.reduce<string[]>((words, wordPattern) => {
    if (/^\d+$/.test(wordPattern) && words.length) words[words.length - 1] += wordPattern
    else words.push(wordPattern)
    return words
  }, [])
}

export function solve(pattern: string, wrong: string, words: readonly string[], allowCombinations = true): Candidate[] {
  const normalizedPattern = cleanPattern(pattern)
  const knownLetters = new Set(normalizedPattern.match(/[a-z]/g) ?? [])
  const wrongLetters = new Set(wrong.toLowerCase().match(/[a-z]/g) ?? [])

  if (!normalizedPattern.length) return []

  const patterns = boardWords(normalizedPattern)
  const phraseCandidates = words
    .filter((word) => word.includes(' '))
    .filter((word) => {
      const wordParts = word.split(' ')
      return wordParts.length === patterns.length && wordParts.every((wordPart, index) => wordPart.length === patterns[index].length && fitsPattern(wordPart, patterns[index], knownLetters))
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
    .filter((word) => fitsPattern(word, wordPattern, knownLetters))
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
