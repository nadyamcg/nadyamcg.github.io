# canary tools (manual)
use these to refresh your static-site canary and push a commit.

## usage
1) cd into your repo root (where `canary/canary.json` lives).
2) run one of:
   - `./refresh_canary.py` (linux/macOS)
   - `pwsh ./refresh_canary.ps1` (windows powershell)
3) the script will:
   - set `last_update` to current UTC
   - generate a new random `token`
   - `git commit` and `git push`

## optional
`make setup-hook` installs a pre-commit hook that fails a commit if the token/timestamp didn't change (needs `jq`).
