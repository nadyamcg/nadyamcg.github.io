# nadyamcg.github.io - static site

## structure
- `/index.html` - home
- `/styles.css` - shared theme (ashspace-inspired)
- `/blog/` - blog index reads `/blog/posts.json`
- `/canary/` - canary page reads `/canary/canary.json`
- `/contact/` - contact links

## canary: how to update

### manual method
1. edit `canary/canary.json`
2. set `last_update` to current UTC in ISO8601 (e.g., `2025-10-15T17:30:00Z`)
3. change `token` to any new string you choose (forces deliberate action)
4. commit & push to main

### assisted method (local script)
for convenience, a local script can do steps 2-4 for you.
see `CANARY-README.md` in root.

by default, `window_days` is `14`; change if needed.

> this process must be done manually. automation defeats the purpose. the act of updating itself is a deliberate, conscious action, which is proof of life.

## blog: how to add a post
1. create a new file in `/blog/` named `<slug>.html`
2. add an entry to `/blog/posts.json`:
```json
{
  "title": "my new post",
  "slug": "my-new-post",
  "date": "2025-10-15",
  "summary": "optional"
}
```
3. commit & push — the index updates automatically on page load.

## notes
- keep `favicon.png` in the repo root.
- all pages share the same navbar + style for consistency.
