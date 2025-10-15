# Makefile helpers
.PHONY: canary setup-hook
canary:
	@./refresh_canary.py

setup-hook:
	@mkdir -p .git/hooks
	@cp pre-commit.sample .git/hooks/pre-commit
	@echo "installed pre-commit hook (requires jq)."
