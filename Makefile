# Monitoring Platform - Docker Management
# Usage: make [command]

.PHONY: help build up down logs clean dev prod restart status

# Default target
help:
	@echo "Monitoring Platform - Docker Commands"
	@echo ""
	@echo "Development Commands:"
	@echo "  make dev          - Start development environment"
	@echo "  make dev-build    - Build and start development environment"
	@echo "  make dev-down     - Stop development environment"
	@echo "  make dev-logs     - Show development logs"
	@echo ""
	@echo "Production Commands:"
	@echo "  make prod         - Start production environment"
	@echo "  make prod-build   - Build and start production environment"
	@echo "  make prod-down    - Stop production environment"
	@echo "  make prod-logs    - Show production logs"
	@echo ""
	@echo "General Commands:"
	@echo "  make status       - Show container status"
	@echo "  make clean        - Remove all containers and volumes"
	@echo "  make restart      - Restart all services"
	@echo "  make shell-backend  - Access backend container shell"
	@echo "  make shell-frontend - Access frontend container shell"
	@echo "  make shell-mongo    - Access MongoDB shell"
	@echo ""

# Development Environment
dev:
	@echo "Starting development environment..."
	docker-compose -f docker-compose.dev.yml up -d
	@echo "Development environment started!"
	@echo "Frontend: http://localhost:3000"
	@echo "Backend API: http://localhost:5000"
	@echo "MongoDB Express: http://localhost:8081 (admin/admin)"
	@echo "Redis Commander: http://localhost:8082"

dev-build:
	@echo "Building and starting development environment..."
	docker-compose -f docker-compose.dev.yml up -d --build

dev-down:
	@echo "Stopping development environment..."
	docker-compose -f docker-compose.dev.yml down

dev-logs:
	@echo "Showing development logs..."
	docker-compose -f docker-compose.dev.yml logs -f

# Production Environment
prod:
	@echo "Starting production environment..."
	docker-compose up -d
	@echo "Production environment started!"
	@echo "Application: http://localhost:80"
	@echo "API: http://localhost:80/api"

prod-build:
	@echo "Building and starting production environment..."
	docker-compose up -d --build

prod-down:
	@echo "Stopping production environment..."
	docker-compose down

prod-logs:
	@echo "Showing production logs..."
	docker-compose logs -f

# General Commands
status:
	@echo "Container Status:"
	@docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

restart:
	@echo "Restarting all services..."
	docker-compose restart
	docker-compose -f docker-compose.dev.yml restart

clean:
	@echo "Cleaning up containers and volumes..."
	docker-compose down -v --remove-orphans
	docker-compose -f docker-compose.dev.yml down -v --remove-orphans
	docker system prune -f
	@echo "Cleanup completed!"

# Shell Access
shell-backend:
	@echo "Accessing backend container..."
	docker exec -it monitoring-backend-dev sh || docker exec -it monitoring-backend sh

shell-frontend:
	@echo "Accessing frontend container..."
	docker exec -it monitoring-frontend-dev sh || docker exec -it monitoring-frontend sh

shell-mongo:
	@echo "Accessing MongoDB shell..."
	docker exec -it monitoring-mongodb-dev mongosh || docker exec -it monitoring-mongodb mongosh

# Database Operations
db-backup:
	@echo "Creating database backup..."
	docker exec monitoring-mongodb-dev mongodump --uri="mongodb://admin:password123@localhost:27017/monitoring-platform?authSource=admin" --out=/data/backup/$(shell date +%Y%m%d_%H%M%S)

db-restore:
	@echo "Restoring database from backup..."
	@echo "Usage: make db-restore BACKUP_DIR=<backup_directory>"
	@if [ -z "$(BACKUP_DIR)" ]; then echo "Please specify BACKUP_DIR"; exit 1; fi
	docker exec monitoring-mongodb-dev mongorestore --uri="mongodb://admin:password123@localhost:27017/monitoring-platform?authSource=admin" /data/backup/$(BACKUP_DIR)

# Health Checks
health:
	@echo "Checking service health..."
	@curl -f http://localhost:3000/health || echo "Frontend: DOWN"
	@curl -f http://localhost:5000/api/health || echo "Backend: DOWN"
	@docker exec monitoring-mongodb-dev mongosh --eval "db.adminCommand('ping')" || echo "MongoDB: DOWN"

# Monitoring
monitor:
	@echo "Monitoring logs in real-time..."
	docker-compose logs -f --tail=100

# Update
update:
	@echo "Updating containers..."
	docker-compose pull
	docker-compose -f docker-compose.dev.yml pull
	@echo "Update completed! Run 'make dev-build' or 'make prod-build' to apply changes."