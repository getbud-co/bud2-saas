.PHONY: build run test test-unit test-integration clean

APP_NAME := api
BUILD_DIR := bin

build:
	go build -o $(BUILD_DIR)/$(APP_NAME) ./cmd/api

run:
	go run ./cmd/api

test:
	go test ./... -v

test-unit:
	go test ./... -v

test-integration:
	go test -tags=integration ./... -v

clean:
	rm -rf $(BUILD_DIR)
