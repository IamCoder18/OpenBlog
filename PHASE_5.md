# Phase 5: Post Editor

## Objective

Implement the content creation interface for OpenBlog, providing a rich Markdown editor with metadata controls, preview functionality, and publishing options. This phase creates the writing experience for both human authors and is accessible to agent accounts, following the DESIGN.md system.

---

## Scope

### Deliverables

1. **Markdown Editor**
   - Large title input field
   - Rich toolbar (Bold, Italic, Lists, Image, Link, Code)
   - Full-width markdown text area
   - Line height optimized for writing (leading-relaxed)

2. **Metadata Sidebar**
   - Cover image upload/selection
   - Topic tags management
   - Visibility toggle (Public/Private)
   - SEO preview section

3. **Preview Mode**
   - Toggle between edit and preview
   - Full Markdown rendering in preview
   - LaTeX formula rendering

4. **Publishing Workflow**
   - "Publishing options" button
   - Save as draft functionality
   - Publish immediately option
   - Schedule for later option

5. **Auto-Save**
   - Real-time word count
   - "All changes saved" indicator
   - Timestamp of last save

---

## UI/UX Governance

**CRITICAL:** This phase must strictly follow DESIGN.md and ui_reference/post_editor.

### Visual Authority

1. **Primary Reference:** `ui_reference/post_editor/code.html` and `screen.png`

2. **Design System Compliance:**

   **Color Palette:**
   - Background: `#131315` (surface)
   - Primary: `#d2bbff`
   - Primary Container: `#7c3aed`
   - Surface Container Low: `#1b1b1d`
   - Surface Container Lowest: `#0e0e10`
   - Surface Container Highest: `#353437`
   - On Surface: `#e5e1e4`
   - On Surface Variant: `#ccc3d8`
   - Outline: `#958da1`

   **Typography:**
   - Headlines: Manrope (font-headline)
   - Body: Inter (font-body)
   - Title input: 5xl font-headline, bold, tracking-tight

   **The "No-Line Rule":**
   - NO borders on input fields except bottom accent
   - Title input: bottom border only (2px, outline-variant/20, transitions to primary on focus)

   **Component Styles:**

   _Toolbar:_
   - Fixed/sticky position below title
   - Background: surface-container-low/50 with backdrop-blur-md
   - Border: outline-variant/10
   - Buttons: surface-container on hover
   - "Markdown guide" link in primary color

   _Meta Sidebar:_
   - Fixed right position, 320px (w-80) width
   - Background: surface-container-lowest
   - Border-left: outline-variant/5
   - Sections with consistent spacing

   _Input Fields:_
   - Title: bg-transparent, border-none, focus:ring-0
   - Bottom accent line transitions to primary on focus with subtle glow

   _Buttons:_
   - Preview: surface-container-highest background, outline-variant/15 border
   - Publish: gradient background (primary to primary-container), shadow-primary/20

   _Status Indicators:_
   - Green pulsing dot for "All changes saved"
   - Word count display

   _Floating Action Buttons (Mobile):_
   - Visibility toggle button
   - Send/Publish button
   - Gradient background for primary action

---

## Agent Verification Checklist

Complete all checkpoints before proceeding to Phase 6 or 7:

- [ ] I have verified the editor layout matches ui_reference/post_editor
- [ ] I have implemented the large title input with bottom accent styling
- [ ] I have implemented the sticky toolbar with formatting options
- [ ] I have implemented the markdown text area
- [ ] I have implemented the metadata sidebar with all sections
- [ ] I have implemented cover image upload/selection
- [ ] I have implemented topic tags management
- [ ] I have implemented visibility toggle
- [ ] I have implemented SEO preview section
- [ ] I have implemented preview mode toggle
- [ ] I have implemented publishing options workflow
- [ ] I have implemented auto-save with word count
- [ ] I have verified mobile floating action buttons
- [ ] I have applied DESIGN.md color palette throughout
- [ ] I have applied the "No-Line Rule" to input fields

---

## Testing & Validation

### Success Criteria

| Criteria                    | Validation Method            |
| --------------------------- | ---------------------------- |
| Editor matches ui_reference | Visual comparison            |
| Markdown renders correctly  | Test with complex markdown   |
| LaTeX formulas render       | Test with math equations     |
| Auto-save functions         | Check word count updates     |
| Publishing workflow         | Test draft and publish flows |
| Mobile responsive           | Test on mobile viewport      |

### Manual Verification

- Type in editor and verify real-time word count
- Toggle preview mode and verify rendering
- Upload cover image and verify display
- Add/remove tags and verify UI updates
- Test visibility toggle changes state

---

## Dependencies

- Phase 4: Admin Dashboard & CMS (completed)

---

## Next Phase Preview

Phase 6 will implement the CLI and Agent Integration:

- Command-line interface for headless operations
- Agent account provisioning
- Markdown file upload via CLI
- Webhook support for automation

Phase 7 will implement SEO, RSS, and Theme System:

- Sitemaps and RSS feeds
- Theme presets and toggling
- Enhanced SEO meta tags
