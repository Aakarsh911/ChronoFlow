.PHONY: dev up down build api web jobs sqlc migrate

dev: up
up:
	docker compose -f infra/docker-compose.yml up --build

down:
	docker compose -f infra/docker-compose.yml down -v

sqlc:
	cd sql && sqlc generate

# Example migrate target using goose if you add it:
# migrate:
# 	goose -dir sql/migrations postgres "$$DATABASE_URL" up

build:
	( cd api && go build ./... )
	( cd jobs && go build ./... )
	( cd mcp/gcal && go build ./... )
	( cd mcp/slack && go build ./... )
	( cd mcp/jira && go build ./... )
	( cd mcp/graph && go build ./... )
