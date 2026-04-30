.PHONY: dev dev-backend dev-frontend dev-agents build build-agents test test-agents test-backend-unit test-backend-integration lint lint-agents clean sqlc-gen api-types agents-api-client migrate-agents check-node-auth

DOCKER_ENV_FILE ?= .env.docker.local

dev:
	@echo "Starting backend, frontend and agents..."
	$(MAKE) dev-backend &
	$(MAKE) dev-frontend &
	$(MAKE) dev-agents &
	wait

dev-backend:
	cd backend && go run ./cmd/api

dev-frontend:
	cd frontend && npm run dev

dev-agents:
	cd agents && uv run bud2-agents

build:
	cd backend && go build -o bin/api ./cmd/api
	cd frontend && npm run build
	$(MAKE) build-agents

build-agents:
	docker build -t bud2-agents ./agents

test:
	cd backend && go test ./... -v
	cd frontend && npm run test:run
	$(MAKE) test-agents

test-agents:
	cd agents && uv run pytest

test-backend-unit:
	cd backend && go test ./... -v

test-backend-integration:
	cd backend && go test -tags=integration ./... -v

lint:
	cd backend && golangci-lint run
	cd frontend && npm run lint
	$(MAKE) lint-agents

lint-agents:
	cd agents && uv run ruff check .
	cd agents && uv run mypy src

clean:
	rm -rf backend/bin
	rm -rf frontend/dist
	rm -rf agents/.venv agents/.pytest_cache agents/.ruff_cache agents/.mypy_cache agents/dist agents/build

check-node-auth:
	@test -f "$(DOCKER_ENV_FILE)" || (echo "$(DOCKER_ENV_FILE) not found." && echo "Copy .env.docker.example to $(DOCKER_ENV_FILE) and set NODE_AUTH_TOKEN with a PAT that has read:packages." && exit 1)
	@grep -Eq '^NODE_AUTH_TOKEN=.+$$' "$(DOCKER_ENV_FILE)" || (echo "NODE_AUTH_TOKEN is missing in $(DOCKER_ENV_FILE)." && echo "Set it to a PAT with read:packages before running make compose-up." && exit 1)

compose-up: check-node-auth
	docker compose --env-file "$(DOCKER_ENV_FILE)" up --build

compose-down:
	@if [ -f "$(DOCKER_ENV_FILE)" ]; then \
		docker compose --env-file "$(DOCKER_ENV_FILE)" down; \
	else \
		NODE_AUTH_TOKEN=unused docker compose down; \
	fi

sqlc-gen:
	cd backend && sqlc generate

api-types:
	npx openapi-typescript backend/api/openapi.yml -o frontend/src/lib/types.ts

agents-api-client:
	cd agents && uv run openapi-python-client generate --path ../backend/api/openapi.yml --config openapi-python-client.yml --output-path src/bud2/infra/bud2/generated --overwrite

migrate-agents:
	cd agents && uv run bud2-agents-migrate
