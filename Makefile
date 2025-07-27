# Makefile for Poker App

# Variables
NPM = npm

# Default target
.PHONY: all
all: help

# Help command
.PHONY: help
help:
	@echo "Available commands:"
	@echo "  make start-client  - Start the React client"
	@echo "  make start-server  - Start the Node.js server"
	@echo "  make start         - Start both client and server"
	@echo "  make test          - Run tests"
	@echo "  make clean         - Remove build artifacts"

# Start the React client
.PHONY: start-client
start-client:
	@echo "Starting React client..."
	cd src && $(NPM) start

# Start the Node.js server
.PHONY: start-server
start-server:
	@echo "Starting Node.js server..."
	cd server && $(NPM) run start-server

# Start both client and server
.PHONY: start
start:
	@echo "Starting both client and server..."
	$(MAKE) start-server & $(MAKE) start-client

# Run tests
.PHONY: test
test:
	$(NPM) test

# Clean build artifacts
.PHONY: clean
clean:
	rm -rf build
