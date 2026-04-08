# PRP 08: Search & Filtering

## Feature Overview

Implement real-time search and multi-criteria filtering for todos to improve discoverability and productivity.

This PRP aligns to Feature 08 criteria in EVALUATION.md and follows USER_GUIDE behavior expectations.

## User Stories

1. As a user, I can search todos by title in real time.
2. As a user, I can search by related tag names in advanced search mode.
3. As a user, I can filter by priority.
4. As a user, I can filter by clicking a tag badge.
5. As a user, I can combine filters and understand active criteria.
6. As a user, I can clear filters quickly.

## User Flow

1. User types in search box.
2. Results update automatically without submit.
3. User sets priority filter.
4. User clicks tag badge to add tag filter.
5. UI applies combined filters using AND logic.
6. UI shows active filter summary.
7. User clicks `Clear all filters` to reset.

## Technical Requirements

### Search Behavior

1. Real-time search with no submit button.
2. Case-insensitive matching.
3. Search over todo titles.
4. Advanced mode includes tag names.
5. Debounced input at `300ms`.

### Filter Behavior

1. Priority filter dropdown.
2. Tag filter via badge click.
3. Combined filters must use AND semantics.
4. Empty-state UI shown when no matches.

### Performance Requirement

1. Filtering 1000 todos should complete in < 100ms on target environment.

### UI Requirements

1. Search input at top of main page.
2. Priority dropdown filter.
3. Tag filter indicator/chip.
4. Filter summary/indicator area.
5. `Clear all filters` action.
6. Helpful empty-result message.

## Validation and Error Handling

1. Guard against null/undefined fields in local filtering logic.
2. Preserve responsiveness while typing (debounce).
3. If fetch-driven search is introduced, handle request cancellation/race safely.

## Acceptance Criteria (Feature 08)

1. Search is case-insensitive.
2. Search includes tag names.
3. Multiple filters combine with AND logic.
4. Results update in real time.
5. Empty-result state is clearly shown.

## Testing Requirements (Feature 08)

### E2E (Playwright)

1. Search by title.
2. Search by tag name.
3. Filter by priority.
4. Filter by tag.
5. Combine multiple filters.
6. Clear filters.

### Performance Test

1. Verify filter/search for 1000 todos completes in < 100ms.

### Unit Tests

1. Case-insensitive text matcher.
2. Combined predicate (AND) behavior.
3. Debounce behavior at 300ms.

## Implementation Checklist

- [ ] search input implemented
- [ ] real-time filtering behavior
- [ ] case-insensitive matching
- [ ] title and tag-name search coverage
- [ ] priority filter dropdown
- [ ] tag-click filtering
- [ ] combined filters (AND logic)
- [ ] active filter summary
- [ ] clear filters action
- [ ] no-results empty state
- [ ] debounce at 300ms

## Out of Scope

1. Full-text search backend index.
2. Saved filter presets.

---

Last Updated: April 8, 2026
PRP ID: 08
