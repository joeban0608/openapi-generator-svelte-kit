.PHONY: db-gen-init
db-gen-init:
	npx drizzle-kit generate --name init

.PHONY: clear
clear:
	docker compose down -v

.PHONY: local
local:
	docker compose up -d
	npx drizzle-kit studio

