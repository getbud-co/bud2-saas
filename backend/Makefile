.PHONY: build run test clean

APP_NAME := api
BUILD_DIR := bin

build:
	go build -o $(BUILD_DIR)/$(APP_NAME) ./cmd/api

run:
	go run ./cmd/api

test:
	go test ./... -v

clean:
	rm -rf $(BUILD_DIR)
