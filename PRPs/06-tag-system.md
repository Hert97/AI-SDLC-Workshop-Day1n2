# PRP 06: Tag System

## Feature Overview

Implement a user-scoped, color-coded tagging system for todo categorization, filtering, and organization.

This PRP aligns to Feature 06 criteria in EVALUATION.md and follows tag UX in USER_GUIDE.md.

## User Stories

1. As a user, I can create custom tags with names and colors.
2. As a user, I can edit or delete tags.
3. As a user, I can assign multiple tags to a todo.
4. As a user, I can filter todos by tag.
5. As a user, tag changes propagate consistently across todos.

## User Flow

1. User opens Manage Tags modal.
2. User creates tag with name and color.
3. Tag appears in create/edit todo forms for selection.
4. User assigns one or more tags to a todo.
5. Todo displays colored tag badges.
6. User clicks badge or filter control to filter by tag.
7. User edits or deletes tag and sees updates reflected globally.

## Technical Requirements

### Data Model

1. `tags` table exists.
2. `todo_tags` join table exists for many-to-many mapping.
3. Tag names are unique per user.
4. Deleting a tag removes its associations in `todo_tags`.

### API Endpoints

1. `GET /api/tags`
2. `POST /api/tags`
3. `PUT /api/tags/[id]`
4. `DELETE /api/tags/[id]`
5. `POST /api/todos/[id]/tags`
6. `DELETE /api/todos/[id]/tags` (remove a specific tag association by tag id in request payload)

### UI Requirements

1. Manage Tags modal with create/edit/delete actions.
2. Tag creation form includes text input and color picker.
3. Tag list shows existing tags and actions.
4. Tag selection controls in create/edit todo forms.
5. Colored tag badges displayed on todos.
6. Click badge/filter control to filter by tag.
7. Visible active-tag filter indicator with clear action.

### UX Rules from User Guide

1. Multiple tags can be selected per todo.
2. Tag pills should be legible in light and dark themes.
3. Default tag color can start at `#3B82F6`.
4. Tag display should wrap cleanly on smaller screens.

## Validation and Error Handling

1. Validate non-empty tag name.
2. Enforce unique tag name per user.
3. Validate color value format.
4. Return clear conflict error for duplicate tag names.
5. Scope all tag operations to authenticated user.

## Acceptance Criteria (Feature 06)

1. Tags are unique per user.
2. Custom colors work in UI.
3. Editing a tag updates associated todo displays.
4. Deleting a tag removes it from todos.
5. Tag filtering works correctly.

## Testing Requirements (Feature 06)

### E2E (Playwright)

1. Create tag.
2. Edit tag name/color.
3. Delete tag.
4. Assign multiple tags to todo.
5. Filter by tag.
6. Validate duplicate-name error behavior.

### Integration Tests

1. Tag CRUD endpoint behavior.
2. Todo-tag assignment and unassignment.
3. Deletion cascade of `todo_tags` associations.

### Unit Tests

1. Tag name validation.
2. Color value validation.
3. Tag-to-badge style mapping.

## Implementation Checklist

- [ ] `tags` and `todo_tags` tables implemented
- [ ] `GET /api/tags` implemented
- [ ] `POST /api/tags` implemented
- [ ] `PUT /api/tags/[id]` implemented
- [ ] `DELETE /api/tags/[id]` implemented
- [ ] `POST /api/todos/[id]/tags` implemented
- [ ] `DELETE /api/todos/[id]/tags` implemented
- [ ] Manage Tags modal implemented
- [ ] tag create form (name + color) implemented
- [ ] tag list with edit/delete implemented
- [ ] tag selection in todo forms implemented
- [ ] colored tag badges on todos implemented
- [ ] click-to-filter by tag implemented
- [ ] active tag-filter indicator with clear action implemented

## Out of Scope

1. Shared/global tags across users.
2. Hierarchical tags.
3. Tag analytics and usage metrics.

---

Last Updated: April 8, 2026
PRP ID: 06