<script lang="ts">
  type Answer = 'yes' | 'no' | 'skip'

  type Restaurant = { id: string; name: string; score: number }

  let restaurants: Restaurant[] = $state([
    { id: '1', name: 'Neon Noodle', score: 0 },
    { id: '2', name: 'Harbor Tacos', score: 0 },
    { id: '3', name: 'Maple & Rye', score: 0 },
  ])

  let currentIndex = $state(0)
  let lastAnswer = $state<Answer | null>(null)

  const current = $derived(restaurants[currentIndex] ?? null)

  function record(answer: Answer) {
    if (!current) return
    lastAnswer = answer
    const i = restaurants.findIndex((r) => r.id === current.id)
    if (i < 0) return
    const delta = answer === 'yes' ? 1 : answer === 'no' ? -1 : 0
    restaurants = restaurants.map((r, j) =>
      j === i ? { ...r, score: r.score + delta } : r,
    )
    currentIndex = (currentIndex + 1) % restaurants.length
  }

  const ranked = $derived(
    [...restaurants].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)),
  )
</script>

<main class="shell">
  <header class="header">
    <p class="eyebrow">Local PWA</p>
    <h1>Restaurant Randomizer</h1>
    <p class="lede">
      Yes / no / skip updates a simple score for each place. Swap this for your real ranking
      algorithm later.
    </p>
  </header>

  <section class="card choice" aria-labelledby="choice-heading">
    <h2 id="choice-heading">Tonight?</h2>
    {#if current}
      <p class="place-name">{current.name}</p>
      <div class="actions">
        <button type="button" class="btn yes" onclick={() => record('yes')}>Yes</button>
        <button type="button" class="btn no" onclick={() => record('no')}>No</button>
        <button type="button" class="btn skip" onclick={() => record('skip')}>Skip</button>
      </div>
      {#if lastAnswer}
        <p class="hint">Last: <strong>{lastAnswer}</strong> (placeholder scoring)</p>
      {/if}
    {:else}
      <p>Add restaurants to get started.</p>
    {/if}
  </section>

  <section class="card" aria-labelledby="rank-heading">
    <h2 id="rank-heading">Ranking</h2>
    <ol class="rank-list">
      {#each ranked as r, i (r.id)}
        <li>
          <span class="rank">{i + 1}.</span>
          <span class="name">{r.name}</span>
          <span class="score">{r.score}</span>
        </li>
      {/each}
    </ol>
  </section>
</main>

<style>
  .shell {
    max-width: 28rem;
    margin: 0 auto;
    padding: 1.5rem 1.25rem 3rem;
    text-align: left;
  }

  .header {
    margin-bottom: 1.75rem;
  }

  .eyebrow {
    margin: 0 0 0.35rem;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
  }

  h1 {
    margin: 0 0 0.5rem;
    font-size: 1.65rem;
    font-weight: 650;
    letter-spacing: -0.02em;
  }

  .lede {
    margin: 0;
    font-size: 0.95rem;
    line-height: 1.5;
    color: var(--muted);
  }

  h2 {
    margin: 0 0 1rem;
    font-size: 1rem;
    font-weight: 600;
  }

  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 1.25rem 1.15rem;
    margin-bottom: 1rem;
    box-shadow: var(--shadow);
  }

  .choice {
    text-align: center;
  }

  .place-name {
    margin: 0 0 1.25rem;
    font-size: 1.35rem;
    font-weight: 600;
    color: var(--heading);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: center;
  }

  .btn {
    font: inherit;
    font-weight: 600;
    padding: 0.55rem 1.1rem;
    border-radius: 8px;
    border: 2px solid transparent;
    cursor: pointer;
    transition:
      background 0.15s,
      border-color 0.15s,
      transform 0.08s;
  }

  .btn:active {
    transform: scale(0.98);
  }

  .btn.yes {
    background: var(--yes-bg);
    color: var(--yes-fg);
    border-color: var(--yes-border);
  }

  .btn.no {
    background: var(--no-bg);
    color: var(--no-fg);
    border-color: var(--no-border);
  }

  .btn.skip {
    background: transparent;
    color: var(--muted);
    border-color: var(--border);
  }

  .btn:focus-visible {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }

  .hint {
    margin: 1rem 0 0;
    font-size: 0.85rem;
    color: var(--muted);
  }

  .rank-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .rank-list li {
    display: grid;
    grid-template-columns: 2rem 1fr auto;
    gap: 0.5rem;
    align-items: baseline;
    padding: 0.45rem 0;
    border-bottom: 1px solid var(--border);
    font-size: 0.95rem;
  }

  .rank-list li:last-child {
    border-bottom: none;
  }

  .rank {
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }

  .name {
    color: var(--heading);
    font-weight: 500;
  }

  .score {
    font-variant-numeric: tabular-nums;
    color: var(--accent);
    font-weight: 600;
  }
</style>
