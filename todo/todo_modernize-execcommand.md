# Modernize PlaceholderEditor execCommand Usage

## Summary

Replace deprecated `document.execCommand()` calls with modern Clipboard and Selection/Range APIs in the PlaceholderEditor component.

## Why

| Current | Proposed |
|---------|----------|
| `document.execCommand()` | Modern Selection/Range APIs |
| Deprecated API (may be removed) | Future-proof browser APIs |
| Works but not recommended | Standards-compliant approach |

The current implementation works reliably across browsers but uses deprecated APIs that may be removed in future browser versions.

## Phase 1: Replace execCommand Calls

**Goal:** Replace all 4 `document.execCommand()` calls with modern alternatives.

### Details

1. **handlePaste (line ~368)** - Replace `execCommand('insertText')`:
   - Use `Selection.getRangeAt()` and `Range.deleteContents()` + `Range.insertNode()`
   - Or use `document.getSelection().modify()` with text node insertion

2. **handleCut (line ~388)** - Replace `execCommand('delete')`:
   - Use `Selection.getRangeAt()` and `Range.deleteContents()`
   - Trigger input event manually after deletion

3. **insertPlaceholder standalone (line ~403)** - Replace `execCommand('insertText')`:
   - Use Selection/Range API to insert text at cursor position

4. **insertPlaceholder paired (line ~412)** - Replace `execCommand('insertText')`:
   - Same approach as standalone

### Implementation Notes

- All replacements need to maintain cursor position tracking
- Must trigger `handleInput` after programmatic changes
- Consider creating a shared `insertTextAtCursor()` utility function
- Test across Chrome, Firefox, Safari, and Edge

## Open Questions

- Should we polyfill for older browsers or require modern browser support?
- Do we need to support mobile browsers with different selection behaviors?
