.PHONY: dev dev-backend dev-frontend build test lint clean sqlc-gen api-types

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

lint:
	cd backend && golangci-lint run
	cd frontend && npm run lint

clean:
	rm -rf backend/bin
	rm -rf frontend/dist

compose-up:
	docker compose up --build

compose-down:
	docker compose down

sqlc-gen:
	cd backend && sqlc generate

api-types:
	npx openapi-typescript backend/api/openapi.yml -o frontend/src/lib/types.ts
