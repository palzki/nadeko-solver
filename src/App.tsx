import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { boardWords, letterFrequency, solve } from './solver'
import { loadWordCategories, type WordCategory, type WordEntry } from './wordLoader'

const categories: WordCategory[] = ['general', 'movies', 'countries', 'anime', 'things', 'animals']
const categoryNames: Record<WordCategory, string> = {
  general: 'Everything',
  movies: 'Movies',
  countries: 'Countries',
  anime: 'Anime',
  things: 'Things',
  animals: 'Animals',
}
const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('')
const shownLimit = 60
const emptyCategories: Record<WordCategory, WordEntry[]> = { general: [], movies: [], countries: [], anime: [], things: [], animals: [] }

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value)
  } catch {
    const fallback = document.createElement('textarea')
    fallback.value = value
    fallback.style.position = 'fixed'
    fallback.style.opacity = '0'
    document.body.appendChild(fallback)
    fallback.select()
    document.execCommand('copy')
    fallback.remove()
  }
}

function App() {
  const [pattern, setPattern] = useState('')
  const [wrong, setWrong] = useState('')
  const [category, setCategory] = useState<WordCategory>('general')
  const [copied, setCopied] = useState('')
  const [wordCategories, setWordCategories] = useState(emptyCategories)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    loadWordCategories().then(setWordCategories).catch((error: unknown) => {
      setLoadError(error instanceof Error ? error.message : 'The word lists could not be loaded.')
    })
  }, [])

  const entries = wordCategories[category]
  const loaded = wordCategories.general.length > 0
  const activeWords = useMemo(() => entries.map((entry) => entry.word), [entries])
  const displayWords = useMemo(() => new Map(entries.map((entry) => [entry.word, entry.displayWord])), [entries])

  const candidates = useMemo(() => solve(pattern, wrong, activeWords, false), [pattern, wrong, activeWords])
  const top = letterFrequency(candidates)[0]?.letter ?? candidates[0]?.nextLetters[0] ?? ''
  const board = useMemo(() => boardWords(pattern), [pattern])
  const revealed = new Set(pattern.toLowerCase().match(/[a-z]/g) ?? [])
  const missed = new Set(wrong.toLowerCase().match(/[a-z]/g) ?? [])
  const counts = useMemo(() => {
    const map = new Map<string, number>()
    candidates.forEach(({ nextLetters }) => nextLetters.forEach((letter) => map.set(letter, (map.get(letter) ?? 0) + 1)))
    return map
  }, [candidates])
  const topCount = counts.get(top) ?? 0

  async function copy(value: string) {
    if (!value) return
    await copyText(value)
    setCopied(value)
    window.setTimeout(() => setCopied((current) => (current === value ? '' : current)), 1400)
  }

  function clear() {
    setPattern('')
    setWrong('')
    setCopied('')
    document.getElementById('pattern')?.focus()
  }

  let verdict: ReactNode
  if (loadError) verdict = <p className="note">{loadError} Reload the page to try again.</p>
  else if (!loaded) verdict = <p className="note">Loading the word lists…</p>
  else if (!board.length) verdict = <p className="note">Paste the board from Nadeko’s hangman message to get your next letter.</p>
  else if (!candidates.length) verdict = <p className="note">No answer fits this board. Check the missed letters, or search another category.</p>
  else if (candidates.length === 1) {
    const solved = displayWords.get(candidates[0].word) ?? candidates[0].word
    verdict = (
      <div className="solved">
        <button key={solved} type="button" className={`solved-word ${solved.length > 14 ? 'is-long' : ''}`} onClick={() => copy(solved)} aria-label={`Copy ${solved}`}>{solved}</button>
        <p className="answer-why">It’s the only answer in the word list that fits this board.</p>
        <button type="button" className="copy" onClick={() => copy(solved)}>{copied === solved ? 'Copied' : 'Copy answer'}</button>
        {top && (
          <p className="solved-alt">
            Or guess <button type="button" className="inline-letter" onClick={() => copy(top)} aria-label={`Copy ${top.toUpperCase()}`}>{copied === top ? '✓' : top.toUpperCase()}</button> to keep going letter by letter.
          </p>
        )}
      </div>
    )
  }

  return (
    <main className="page">
      <header className="masthead">
        <h1>Hangman helper</h1>
        <div className="categories" role="radiogroup" aria-label="Search in">
          {categories.map((item) => (
            <button key={item} type="button" role="radio" aria-checked={category === item} className="category" onClick={() => setCategory(item)}>
              {categoryNames[item]}
            </button>
          ))}
        </div>
      </header>

      <section className="inputs" aria-label="Board">
        <div className="field field-board">
          <label htmlFor="pattern">Board</label>
          <input id="pattern" value={pattern} onChange={(event) => setPattern(event.target.value)} placeholder="Paste it here" autoComplete="off" spellCheck={false} autoFocus />
        </div>
        <div className="field field-missed">
          <label htmlFor="wrong">Missed letters</label>
          <input id="wrong" value={wrong} onChange={(event) => setWrong(event.target.value)} placeholder="None yet" autoComplete="off" spellCheck={false} />
        </div>
        <button type="button" className="clear" onClick={clear} disabled={!pattern && !wrong}>Clear</button>
      </section>

      <section className="stage">
        <div className="answer" aria-live="polite">
          {verdict ?? (
            <>
              <button key={top} type="button" className="big-letter" onClick={() => copy(top)} aria-label={`Copy ${top.toUpperCase()}`}>
                {top.toUpperCase()}
              </button>
              <div className="answer-text">
                <p className="answer-line">Guess <strong>{top.toUpperCase()}</strong> next</p>
                <p className="answer-why">It’s in {topCount} of {candidates.length} possible {candidates.length === 1 ? 'answer' : 'answers'}.</p>
                <button type="button" className="copy" onClick={() => copy(top)}>{copied === top ? 'Copied' : `Copy ${top.toUpperCase()}`}</button>
              </div>
            </>
          )}
        </div>

        {board.length > 0 && (
          <div className="board" aria-label="Board as read">
            {board.map((word, wordIndex) => (
              <span className="board-word" key={wordIndex}>
                {[...word].map((letter, index) => (
                  <span key={index} className={`tile ${letter === '_' ? 'is-blank' : ''}`}>{letter === '_' ? '' : letter.toUpperCase()}</span>
                ))}
              </span>
            ))}
          </div>
        )}
      </section>

      {board.length > 0 && (
      <section className="letters" aria-label="Letters">
        <ol className="alphabet">
          {alphabet.map((letter) => {
            const count = counts.get(letter) ?? 0
            const state = revealed.has(letter) ? 'on-board' : missed.has(letter) ? 'missed' : letter === top ? 'top' : count ? 'possible' : 'unlikely'
            const describe = state === 'on-board' ? 'on the board' : state === 'missed' ? 'missed' : `in ${count} possible ${count === 1 ? 'answer' : 'answers'}`
            return (
              <li key={letter}>
                <button type="button" className={`key is-${state}`} onClick={() => copy(letter)} title={`${letter.toUpperCase()}: ${describe}. Click to copy.`} aria-label={`${letter.toUpperCase()}, ${describe}`}>
                  <span className="key-letter">{copied === letter ? '✓' : letter.toUpperCase()}</span>
                  <span className="key-bar" style={{ ['--fill' as string]: candidates.length && (state === 'top' || state === 'possible') ? count / candidates.length : 0 }} />
                </button>
              </li>
            )
          })}
        </ol>
        <p className="legend">The bar shows how many possible answers contain each letter. <span className="legend-missed">Pink</span> letters are missed. Click any letter to copy it.</p>
      </section>
      )}

      {candidates.length > 0 && (
        <section className="answers">
          <h2>Possible answers <span className="answers-count">{candidates.length}</span></h2>
          <ul className="answer-list">
            {candidates.slice(0, shownLimit).map(({ word }) => {
              const display = displayWords.get(word) ?? word
              return (
                <li key={word}>
                  <button type="button" className="answer-word" onClick={() => copy(display)} title={`Copy ${display}`}>
                    {[...display].map((character, index) => (
                      <span key={index} className={top && character.toLowerCase() === top ? 'hit' : undefined}>{character}</span>
                    ))}
                    {copied === display && <span className="answer-copied">copied</span>}
                  </button>
                </li>
              )
            })}
          </ul>
          {candidates.length > shownLimit && <p className="note">And {candidates.length - shownLimit} more. Guess a few letters to narrow it down.</p>}
        </section>
      )}

      <footer className="footer">Runs entirely in your browser. Nothing you type is sent anywhere.</footer>
    </main>
  )
}

export default App
