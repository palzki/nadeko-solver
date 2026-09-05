# Hangman Solve

A local browser-based solver for Hangman rounds played through Nadeko Bot on Discord.

## Run it

```powershell
npm install
npm run dev
```

Open the local Vite URL shown in the terminal. Paste Nadeko's board into **Guess from Nadeko** and enter missed letters in any format, such as `oqx`, `o q x`, or `o, q, x`. Revealed letters are already part of the board pattern, so no separate revealed/tried field is needed. The solver filters its bundled word list and ranks the most useful next letters by frequency.

Everything runs in the browser. There is no Discord login, bot token, backend, or message upload.

The word corpus comes from the five YAML files in `public/data/`: `movies.yml`, `countries.yml`, `anime.yml`, `things.yml`, and `animals.yml`. Each file contains Nadeko entries with a `word` and optional `imageUrl`. The app loads them locally at runtime, normalizes punctuation while preserving word boundaries, and uses only the selected category.

## Build

```powershell
npm run build
```
