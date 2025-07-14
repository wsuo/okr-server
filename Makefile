# Makefile for Claude Code Hooks Integration
# NestJS OKR Server Project

.PHONY: lint test format build clean

# Lint target - called by smart-lint.sh after file edits
# Receives FILE= argument with relative path to edited file
lint:
	@if [ -n "$(FILE)" ]; then \
		echo "Linting specific file: $(FILE)" >&2; \
		npx eslint --fix "$(FILE)" || exit 1; \
		npx prettier --write "$(FILE)" || exit 1; \
	else \
		echo "Linting all files" >&2; \
		npm run lint || exit 1; \
		npm run format || exit 1; \
	fi

# Test target - called by smart-test.sh after file edits
# Receives FILE= argument with relative path to edited file
test:
	@if [ -n "$(FILE)" ]; then \
		echo "Testing specific file: $(FILE)" >&2; \
		case "$(FILE)" in \
			*.spec.ts|*.test.ts) \
				npx jest "$(FILE)" --passWithNoTests || exit 1 ;; \
			*) \
				echo "Running related tests for: $(FILE)" >&2; \
				npx jest --findRelatedTests "$(FILE)" --passWithNoTests || exit 1 ;; \
		esac \
	else \
		echo "Running all tests" >&2; \
		npm test -- --passWithNoTests || exit 1; \
	fi

# Format target (standalone)
format:
	@npm run format

# Build target
build:
	@npm run build

# Clean target
clean:
	@npm run prebuild

# Development server
dev:
	@npm run start:dev

# Production server
prod:
	@npm run start:prod

# Database migration targets
migration-generate:
	@npm run migration:generate

migration-run:
	@npm run migration:run

migration-revert:
	@npm run migration:revert

# Seed template data
seed:
	@npm run seed:template

# Export Swagger documentation
export-swagger:
	@npm run export:swagger

# Coverage report
coverage:
	@npm run test:cov

# E2E tests
test-e2e:
	@npm run test:e2e

# Helper target to check if this Makefile is being detected
check-integration:
	@echo "✓ Makefile detected by Claude Code hooks" >&2
	@echo "  - 'make lint' target: available" >&2
	@echo "  - 'make test' target: available" >&2
	@echo "" >&2
	@echo "Test with:" >&2
	@echo "  make lint FILE=src/main.ts" >&2
	@echo "  make test FILE=src/main.spec.ts" >&2
	@echo "" >&2
	@echo "Available targets:" >&2
	@echo "  lint, test, format, build, clean, dev, prod" >&2
	@echo "  migration-generate, migration-run, migration-revert" >&2
	@echo "  seed, export-swagger, coverage, test-e2e" >&2