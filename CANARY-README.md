# canary tools - SSH-only
set your remote to SSH first:
```bash
git remote set-url origin git@github.com:<USER>/<REPO>.git
```
## usage
- linux/mac: `./refresh_canary.py`
- windows: `pwsh ./refresh_canary.ps1`
both will update `canary/canary.json`, commit, and push over SSH.
## optional guard
`make setup-hook` installs a pre-commit hook that blocks HTTPS remotes and ensures the canary actually changed (needs `jq`).
### notes
if you're using linux, be sure to mark `refresh_canary.py` as an executable:
`chmod +x refresh_canary.py`

> do not automate this process. manual action is the proof-of-life.