# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
```bash
# Start development server with hot reload
npm run start:dev

# Build for production
npm run build

# Start production server
npm run start:prod

# Run tests
npm run test
npm run test:watch
npm run test:cov
npm run test:e2e

# Code quality
npm run lint
npm run format
```

### Database Operations
```bash
# Generate migration (requires database connection)
npm run migration:generate -- src/migrations/MigrationName

# Run migrations
npm run migration:run

# Revert migrations
npm run migration:revert

# Initialize default template data
npm run seed:template
```

### Utility Scripts
```bash
# Export Swagger documentation
npm run export:swagger
```

## Architecture Overview

This is a NestJS-based OKR (Objectives and Key Results) performance management system with multi-role support for enterprise use.

### Core Technology Stack
- **Framework**: NestJS with TypeScript
- **Database**: MySQL with TypeORM
- **Authentication**: JWT with Passport strategies
- **Documentation**: Swagger/OpenAPI auto-generated
- **Caching**: Redis integration
- **Logging**: Winston with custom configuration

### Key Business Domains

**1. User Management & Authentication**
- Multi-role system: admin, boss, leader, employee
- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Department hierarchy management

**2. OKR Management**
- Objective and Key Result creation and tracking
- Progress tracking with weighted calculations
- Hierarchical OKR structure support

**3. Performance Assessment System**
- Template-based evaluations with configurable scoring
- Dual evaluation model: self-evaluation (30%) + leader evaluation (70%)
- Assessment lifecycle management (draft → active → completed → ended)
- Complex weighted scoring across multiple categories

**4. Template System**
- Configurable assessment templates with JSON schema
- Default template with 3 categories: Work Performance (60%), Daily Management (30%), Leader Evaluation (10%)
- Template cloning and versioning support
- Soft delete functionality

### Important Data Relationships

**User Hierarchy**:
- Users belong to departments
- Users have direct leader relationships (manager-subordinate)
- Many-to-many relationship with roles
- Soft delete support with `deleted_at` timestamps

**Assessment Flow**:
- Assessments → AssessmentParticipants → Evaluations
- Two evaluation types: 'self' and 'leader'
- Final scoring calculation in `assessments.service.ts:220-221`

**Template Configuration**:
- Complex JSON schema stored in `templates.config` field
- Multi-level weighting system (categories → items → evaluators)
- Validation logic in `templates.service.ts`

### Database Schema Patterns

**Soft Delete Pattern**: Most entities use `@DeleteDateColumn()` for soft deletion. Always filter queries with `deleted_at IS NULL` or `deleted_at: null`.

**Audit Pattern**: Entities include `created_at`, `updated_at`, and `deleted_at` timestamps.

**Relationship Pattern**: Heavy use of TypeORM relations with proper join strategies for performance.

### Critical Business Logic

**Assessment Scoring Algorithm** (in `assessments.service.ts`):
```typescript
participant.final_score = participant.self_score * 0.3 + participant.leader_score * 0.7;
```

**Template Validation**: Complex validation logic in `templates.service.ts` ensures weight totals equal 1.0 for evaluator types.

**Status Transitions**: Assessments have strict state machine validation with defined allowed transitions.

### Development Considerations

**Environment Setup**:
- Copy `.env.example` to `.env` and configure database credentials
- Database initialization requires running SQL files in sequence from `database/sql/`
- Default system accounts available (admin/boss/lisi/zhaoliu/zhangsan/wangwu, all with password `123456`)

**Database Migrations**:
- Located in `src/database/migrations/`
- Use TypeORM CLI commands through npm scripts
- Manual SQL execution may be required for complex schemas

**Seeding**:
- Default assessment template seeding available via `npm run seed:template`
- Seed data includes complex template configuration for performance evaluations

**API Documentation**:
- Auto-generated Swagger available at `/api-docs` when running
- Export scripts available for static documentation generation

**Testing Strategy**:
- Jest configuration for unit and e2e tests
- Coverage reporting available
- Test database configuration separate from development

## Important Code Patterns

**Query Pattern**: Always include soft delete filtering in repository queries:
```typescript
.where('entity.deleted_at IS NULL')
// or
where: { deleted_at: null }
```

**Error Handling**: Use NestJS built-in exceptions (`BadRequestException`, `NotFoundException`, etc.) with Chinese error messages.

**Validation**: Use `class-validator` decorators in DTOs with proper validation pipes.

**Transaction Management**: Use QueryRunner for complex operations requiring transactions, especially in assessment and template management.