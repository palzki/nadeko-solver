import { useEffect, useMemo, useState } from 'react'
import { Check, Clipboard, RotateCcw, Search, X } from 'lucide-react'
import { letterFrequency, solve } from './solver'
import { loadWordCategories, type WordCategory, type WordEntry } from './wordLoader'

const categoryLabels = {
  movies: 'movies',
  countries: 'countries',
  anime: 'anime',
  things: 'things',
  animals: 'animals',
} as const
type Category = WordCategory
const allCategories = Object.keys(categoryLabels) as Category[]

const examples = [
  { label: 'Screenshot', pattern: '______', wrong: 'o' },
  { label: '6 letters', pattern: '_ _ _ _ _ _', wrong: '' },
  { label: 'Pattern', pattern: 'c _ _ _ _ _', wrong: 'ae' },
  { label: 'Lucky guess', pattern: '_ a _ _ e _', wrong: 's t' },
  { label: 'Nadeko phrase', pattern: '_ a _ _ i _ _   _ e a _ _ _ _', wrong: '' },
  { label: 'Country phrase', pattern: '_ a _   T _ m _   a n d   _ r _ n _ _ _ _', wrong: '', category: 'countries' as const },
]

function App() {
  const [pattern, setPattern] = useState('')
  const [wrong, setWrong] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<Category>('things')
  const [copied, setCopied] = useState('')
  const [wordCategories, setWordCategories] = useState<Record<Category, WordEntry[]>>({ movies: [], countries: [], anime: [], things: [], animals: [] })
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    loadWordCategories().then(setWordCategories).catch((error: unknown) => {
      setLoadError(error instanceof Error ? error.message : 'Unable to load word lists')
    })
  }, [])

  const activeWords = useMemo(
    () => wordCategories[selectedCategory].map((entry) => entry.word),
    [selectedCategory, wordCategories],
  )

  const candidates = useMemo(
    () => solve(pattern, wrong, activeWords, false),
    [pattern, wrong, activeWords, selectedCategory],
  )
  const frequencies = useMemo(() => letterFrequency(candidates), [candidates])
  const topSuggestion = frequencies[0]?.letter ?? candidates[0]?.nextLetters[0] ?? ''

  function applyExample(example: typeof examples[number]) {
    setPattern(example.pattern)
    setWrong(example.wrong)
    if (example.category) setSelectedCategory(example.category)
  }

  async function copySuggestion(value: string) {
    if (!value) return
    try {
      await navigator.clipboard?.writeText(value)
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
    setCopied(value)
    window.setTimeout(() => setCopied(''), 1400)
  }

  function reset() {
    setPattern('')
    setWrong('')
    setSelectedCategory('things')
    setCopied('')
  }

  return (
    <main className="app-shell">
      <nav className="topbar" aria-label="Primary navigation">
        <div className="brand"><span className="brand-mark">H</span><span>hangman<span className="brand-dot">.</span>solve</span></div>
        <span className="nav-note"><span className="status-dot" /> local solver</span>
      </nav>

      <section className="workspace" aria-label="Hangman solver">
        <div className="input-panel panel">
          <div className="panel-heading"><div><span className="step-label">01 / board state</span><h2>What does Nadeko show?</h2></div><button className="icon-button" onClick={reset} title="Reset solver" aria-label="Reset solver"><RotateCcw size={17} /></button></div>
          <div className="category-toggle-group"><span className="field-label category-label">Search in</span><div className="category-toggles" role="radiogroup" aria-label="Word category">{allCategories.map((category) => <button key={category} className={`category-toggle ${selectedCategory === category ? 'is-selected' : ''}`} role="radio" aria-checked={selectedCategory === category} onClick={() => setSelectedCategory(category)}>{categoryLabels[category]}</button>)}</div></div>
          <label className="field-label" htmlFor="pattern">Guess from Nadeko</label>
          <div className="pattern-wrap"><Search size={18} /><input id="pattern" value={pattern} onChange={(event) => setPattern(event.target.value)} autoComplete="off" /><span className="pattern-hint">spaces okay</span></div>
          <p className="field-help">Paste the underscore line from the Guess panel. Revealed letters stay in the board; wider gaps separate words.</p>

          <div><label className="field-label" htmlFor="wrong">Missed letters</label><input id="wrong" className="text-input" value={wrong} onChange={(event) => setWrong(event.target.value)} /></div>

          <div className="examples"><span>Try an example</span>{examples.map((example) => <button key={example.label} onClick={() => applyExample(example)}>{example.label}</button>)}</div>
        </div>

        <div className="result-panel panel">
          <div className="result-header"><div><span className="step-label">02 / recommendation</span><h2>Your next move</h2></div><div className="match-count">{candidates.length} <span>matches</span></div></div>
          <div className="suggestion-box">
            <div className="suggestion-kicker">highest frequency</div>
            <div className="suggestion-letter">{topSuggestion || '—'}</div>
            <p>{topSuggestion ? `Try “${topSuggestion.toUpperCase()}” next. It appears in the most remaining words.` : 'Enter a pattern to reveal your strongest next guess.'}</p>
            <button className="copy-button" onClick={() => copySuggestion(topSuggestion)} disabled={!topSuggestion}>{topSuggestion && copied === topSuggestion ? <><Check size={16} /> copied</> : <><Clipboard size={16} /> copy letter</>}</button>
          </div>
          <div className="frequency-list"><div className="mini-heading">Most useful letters</div>{frequencies.length ? frequencies.map(({ letter, count }, index) => <button className={`frequency-row ${index === 0 ? 'is-top' : ''}`} key={letter} onClick={() => copySuggestion(letter)}><span className="frequency-rank">0{index + 1}</span><strong>{letter}</strong><span className="frequency-track"><i style={{ width: `${(count / frequencies[0].count) * 100}%` }} /></span><span className="frequency-count">{count}</span></button>) : <p className="empty-state">No candidates yet. Check the word length and wrong letters.</p>}</div>
        </div>
      </section>

      <section className="candidates-section"><div className="section-heading"><div><span className="step-label">03 / shortlist</span><h2>Words still in play</h2></div><span className="corpus-note">showing {Math.min(candidates.length, 48)} of {candidates.length} matches</span></div><div className="candidate-grid">{loadError ? <div className="empty-candidates"><X size={17} /> {loadError}</div> : candidates.slice(0, 48).map((candidate, index) => <button className="candidate-card" key={candidate.word} onClick={() => copySuggestion(candidate.word)} title={`Copy ${candidate.word}`}><span className="candidate-index">{copied === candidate.word ? 'copied' : String(index + 1).padStart(2, '0')}</span><strong>{candidate.word}</strong><span>{candidate.nextLetters.length ? `${candidate.nextLetters.slice(0, 4).join(' · ')} likely next` : 'all letters known'}</span></button>)}{!loadError && !candidates.length && <div className="empty-candidates"><X size={17} /> {activeWords.length ? 'No words match this board state.' : 'Loading word list...'}</div>}</div></section>
      <footer>Built for quick guesses in the middle of a Discord round <span>·</span> no messages leave your browser</footer>
    </main>
  )
}

export default App
