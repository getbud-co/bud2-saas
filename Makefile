.PHONY: dev dev-backend dev-frontend build test test-backend-unit test-backend-integration lint clean sqlc-gen api-types check-node-auth

DOCKER_ENV_FILE ?= .env.docker.local

dev:
	@echo "Starting backend and frontend..."
	$(MAKE) dev-backend &
	$(MAKE) dev-frontend &
	wait

dev-backend:
	cd backend && go run ./cmd/api

dev-frontend:
	cd frontend && npm run dev

build:
	cd backend && go build -o bin/api ./cmd/api
	cd frontend && npm run build

test:
	cd backend && go test ./... -v
	cd frontend && npm run test:run

test-backend-unit:
	cd backend && go test ./... -v

test-backend-integration:
	cd backend && go test -tags=integration ./... -v

lint:
	cd backend && golangci-lint run
	cd frontend && npm run lint

clean:
	rm -rf backend/bin
	rm -rf frontend/dist

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
