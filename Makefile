# SSH-only helpers
.PHONY: canary setup-hook check-ssh
canary:
	@./refresh_canary.py
setup-hook:
	@mkdir -p .git/hooks
	@cp pre-commit.sample .git/hooks/pre-commit
	@echo "installed pre-commit hook (requires jq)."
check-ssh:
	@url=$$(git remote get-url origin); \
	if echo $$url | grep -q '^https://'; then \
	  echo "error: origin is HTTPS. run: git remote set-url origin git@github.com:<USER>/<REPO>.git"; \
	  exit 2; \
	else \
	  echo "origin: $$url"; \
	fi
