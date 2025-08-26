.PHONY: help build up down restart logs clean dev prod secrets

# Default target
help:
	@echo "CV Scanner - Docker Management Commands"
	@echo ""
	@echo "Development Commands:"
	@echo "  make dev-build    Build development environment"
	@echo "  make dev-up       Start development environment"
	@echo "  make dev-down     Stop development environment"
	@echo "  make dev-logs     View development logs"
	@echo "  make dev-restart  Restart development environment"
	@echo ""
	@echo "Production Commands:"
	@echo "  make prod-build   Build production environment"
	@echo "  make prod-up      Start production environment"
	@echo "  make prod-down    Stop production environment"
	@echo "  make prod-logs    View production logs"
	@echo "  make prod-restart Restart production environment"
	@echo ""
	@echo "Utility Commands:"
	@echo "  make secrets      Create secret files template"
	@echo "  make clean        Clean up Docker resources"
	@echo "  make backup       Create database backup"
	@echo "  make restore      Restore database from backup"
	@echo ""

# Development environment commands
dev-build:
	docker-compose -f docker-compose.dev.yml --env-file .env.development build

dev-up:
	docker-compose -f docker-compose.dev.yml --env-file .env.development up -d

dev-down:
	docker-compose -f docker-compose.dev.yml down

dev-logs:
	docker-compose -f docker-compose.dev.yml logs -f

dev-restart:
	docker-compose -f docker-compose.dev.yml --env-file .env.development restart

# Production environment commands
prod-build:
	docker-compose --env-file .env.production build

prod-up:
	docker-compose --env-file .env.production up -d

prod-down:
	docker-compose down

prod-logs:
	docker-compose logs -f

prod-restart:
	docker-compose --env-file .env.production restart

# Full environment commands
build: prod-build

up: prod-up

down: prod-down

logs: prod-logs

restart: prod-restart

# Utility commands
secrets:
	@echo "Creating secret files template..."
	@mkdir -p secrets
	@echo "your_secure_db_password" > secrets/db_password.txt
	@echo "your_cloudinary_cloud_name" > secrets/cloudinary_cloud_name.txt
	@echo "your_cloudinary_api_key" > secrets/cloudinary_api_key.txt
	@echo "your_cloudinary_api_secret" > secrets/cloudinary_api_secret.txt
	@echo "Secret files created in ./secrets/"
	@echo "⚠️  Remember to update these with your actual values!"

clean:
	@echo "Cleaning up Docker resources..."
	docker-compose down --volumes --remove-orphans
	docker system prune -f
	docker volume prune -f
	@echo "Cleanup completed!"

backup:
	@echo "Creating database backup..."
	@docker-compose exec postgres pg_dump -U postgres cv_scanner_db > backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "Backup created: backup_$(shell date +%Y%m%d_%H%M%S).sql"

restore:
	@echo "Please provide backup file name:"
	@read -p "Backup file: " backup_file; \
	docker-compose exec -T postgres psql -U postgres cv_scanner_db < $$backup_file
	@echo "Database restored from $$backup_file"

# Health check commands
health:
	@echo "Checking service health..."
	@docker-compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

health-app:
	@echo "Checking application health..."
	@curl -f http://localhost:3000/health || echo "Application health check failed"

# Database commands
db-shell:
	docker-compose exec postgres psql -U postgres -d cv_scanner_db

db-migrate:
	docker-compose exec app npm run migration:run

db-generate:
	docker-compose exec app npm run migration:generate

# Application commands
app-shell:
	docker-compose exec app sh

app-test:
	docker-compose exec app npm test

app-logs:
	docker-compose logs -f app

# Monitoring commands
stats:
	@echo "Container resource usage:"
	@docker stats --no-stream

df:
	@echo "Docker disk usage:"
	@docker system df

# Quick setup for new developers
setup:
	@echo "Setting up CV Scanner development environment..."
	$(MAKE) secrets
	@echo ""
	@echo "Next steps:"
	@echo "1. Update the secret files in ./secrets/ with your actual values"
	@echo "2. Run 'make dev-up' to start the development environment"
	@echo "3. Run 'make db-migrate' to run database migrations"
	@echo "4. Access the application at http://localhost:3000"
