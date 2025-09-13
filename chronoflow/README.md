# chronoflow

Monorepo scaffolding:
- Next.js frontend in `web/`
- Go API in `api/`
- Go Jobs in `jobs/`
- Go MCP adapters in `mcp/`
- Postgres schema & sqlc in `sql/`
- Local dev compose in `infra/docker-compose.yml`

## Quick start
1. Install Node 20+, Go 1.22+, Docker.
2. Generate sqlc code: `make sqlc`
3. Start dev stack: `make dev`
4. Open http://localhost:3000

## Next steps
- Wire API to Postgres/Redis and expose /v1 endpoints.
- Add OAuth flows and provider SDKs.
- Implement scheduler/defrag in `core/`.
