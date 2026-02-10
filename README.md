# nadyamcg.github.io

my personal multi-purpose static website.

still under construction.

## structure

- `/index.html` - home
- `/assets/` - gifs and images the site uses
  - lots shamelessly adapted from fauux.neocities.org (check them out)
- `/styles.css` - theme
- `/blog/` - personal blog
  - reads from `/blog/posts.json`
- `/web-projects/` - various, usually niche JS tools
  - reads from `/web-projects/projects.json`
- `/canary/` - proof that I'm still here
  - reads from `/canary/canary.json`
- `/contact/` - contact information and links

## canary

the point of the canary is to act as a dead man's switch. to provide others with actionable information, instructions, or closure in the event that something were to happen to me. it's not very convenient and may be redesigned soon. 

the whole point is that by pestering me and requiring deliberate action to refresh, I am forced to provide proof of life. there is actionable proof that I was alive and had access to my accounts in the past 14 days.

### updating the canary

the following methods are intentionally annoying. this process must be done manually, automation defeats the purpose. the act of updating itself is a deliberate, conscious action, which is the proof of life.

#### caveman method (manual)
1. edit `canary/canary.json`
2. set `last_update` to current UTC in ISO8601 (e.g., `2025-10-15T17:30:00Z`)
3. change `token` to any new string you choose (forces deliberate action)
4. commit & push to main

#### normal method (script)

for convenience, a local script can do steps 2-4 for you if you are willing to set up SSH.
see `CANARY-README.md` in root.

by default, `window_days` is `14`; change if needed.

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
3. commit & push
  - there's probably a better way to do this

## notes

- all pages share the same navbar + style for consistency, while allowing for variations.

---
