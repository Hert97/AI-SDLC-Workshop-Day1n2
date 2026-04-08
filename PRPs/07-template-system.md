# PRP 07: Template System

## Feature Overview

Implement reusable todo templates so users can quickly create repeated task patterns with consistent settings.

This PRP aligns to Feature 07 criteria in EVALUATION.md and follows template workflows in USER_GUIDE.md.

## User Stories

1. As a user, I can save a todo configuration as a template.
2. As a user, I can provide template name, description, and category.
3. As a user, I can view and manage templates.
4. As a user, I can create todos instantly from a selected template.
5. As a user, I can trust template metadata and subtasks to be restored correctly.

## User Flow

1. User fills todo form with desired settings.
2. User clicks Save as Template.
3. User enters template metadata and saves.
4. User opens template picker/manager.
5. User selects template and clicks Use.
6. System creates new todo with template configuration.
7. User can edit or delete templates from template manager.

## Technical Requirements

### Data Model

1. `templates` table exists with user ownership.
2. Template stores key todo metadata (title template, priority, recurrence, reminder, category, description).
3. Subtasks are serialized as JSON when saved in template context.

### API Endpoints

1. `GET /api/templates`
2. `POST /api/templates`
3. `PUT /api/templates/[id]`
4. `DELETE /api/templates/[id]`
5. `POST /api/templates/[id]/use`

### Template Use Behavior

1. Using a template creates a new todo for the current user.
2. Created todo inherits template settings (priority, recurrence, reminder, category metadata where applicable).
3. Subtasks are recreated from serialized JSON.
4. Due date offset logic is applied when template defines relative scheduling.

### UI Requirements

1. Save as Template action from todo form.
2. Save-template modal (name, description, category).
3. Use Template dropdown/selector.
4. Template management modal with list, preview, use, edit, and delete.
5. Category filter in template modal.

## Validation and Error Handling

1. Template name is required.
2. Validate template payload and serialized subtask JSON.
3. Handle malformed template data safely on use.
4. Ensure template operations are user-scoped.

## Acceptance Criteria (Feature 07)

1. User can save current todo as template.
2. Templates include all required metadata.
3. Using a template creates a new todo.
4. Subtasks are recreated from JSON.
5. Category filtering works.

## Testing Requirements (Feature 07)

### E2E (Playwright)

1. Save todo as template.
2. Create todo from template.
3. Verify template preserves settings.
4. Verify subtasks are created from template.
5. Edit template.
6. Delete template.

### Integration Tests

1. Template CRUD endpoints.
2. `POST /api/templates/[id]/use` behavior and output.
3. User-scoped template access controls.

### Unit Tests

1. Subtask JSON serialization/deserialization.
2. Template payload validation.
3. Due-date offset calculation logic.

## Implementation Checklist

- [ ] `templates` table implemented
- [ ] `GET /api/templates` implemented
- [ ] `POST /api/templates` implemented
- [ ] `PUT /api/templates/[id]` implemented
- [ ] `DELETE /api/templates/[id]` implemented
- [ ] `POST /api/templates/[id]/use` implemented
- [ ] Save as Template action implemented
- [ ] save-template modal (name/description/category) implemented
- [ ] Use Template action implemented
- [ ] template selection/management modal implemented
- [ ] category filter in template modal implemented
- [ ] template preview implemented
- [ ] subtasks JSON serialization implemented
- [ ] due-date offset calculation implemented

## Out of Scope

1. Shared templates between users.
2. Template version history.
3. AI-generated template suggestions.

---

Last Updated: April 8, 2026
PRP ID: 07