# Phase 4: Admin Dashboard & CMS

## Objective

Implement the administrative interface for OpenBlog, providing human moderators with a comprehensive dashboard for analytics, content management, and site configuration. This phase includes the Analytics Dashboard and the CMS Post Manager, following the DESIGN.md system and ui_reference files.

---

## Scope

### Deliverables

1. **Admin Dashboard (Analytics)**
   - KPI cards grid (bento style) for key metrics
   - Growth trajectory chart (daily unique visitors)
   - Traffic source distribution visualization
   - Top performing stories table
   - Date range selector

2. **CMS Post Manager**
   - Post list with status indicators (Published/Scheduled/Draft/Archive)
   - Search functionality
   - Filtering by status
   - Quick actions (Edit, Delete, More options)
   - Pagination

3. **Sidebar Navigation**
   - Analytics link (active state on dashboard)
   - Stories link (active state on CMS)
   - Media library link
   - Settings link
   - Help link
   - User profile section
   - Logout functionality
   - "New Post" quick action button

4. **Settings Panel**
   - Site-wide configuration options
   - User management
   - Agent account provisioning

---

## UI/UX Governance

**CRITICAL:** This phase must strictly follow DESIGN.md and ui_reference files.

### Visual Authority

1. **Primary References:**
   - `ui_reference/admin_dashboard/code.html` and `screen.png` for analytics
   - `ui_reference/admin_cms_manager/code.html` and `screen.png` for post management

2. **Design System Compliance:**

   **Color Palette (from DESIGN.md):**
   - Background: `#131315` (surface)
   - Primary: `#d2bbff`
   - Primary Container: `#7c3aed`
   - Surface Container Low: `#1b1b1d`
   - Surface Container: `#201f21`
   - Surface Container Highest: `#353437`
   - On Surface: `#e5e1e4`
   - On Surface Variant: `#ccc3d8`
   - Secondary: `#d2bbff`
   - Tertiary: `#ffb784`

   **Typography:**
   - Headlines: Manrope (font-headline)
   - Body: Inter (font-body)
   - Labels: Inter (font-label)

   **The "No-Line Rule":**
   - NO 1px solid borders for sectioning
   - Use background color shifts
   - For cards, use surface-container-low with subtle borders only when needed

   **Component Styles:**

   _KPI Cards:_
   - Background: surface-container-low
   - Border: outline-variant at 5% opacity
   - Icon containers with 10% opacity background
   - Trend indicators with trending_up/trending_down icons

   _Sidebar:_
   - Fixed left position, 256px (w-64) width
   - Background: zinc-900/950
   - Active nav items: bg-violet-500/10, text-violet-300, border-r-2 border-violet-500
   - Hover: bg-zinc-800

   _Data Tables:_
   - Use surface-container-low background
   - Divide rows with outline-variant at 10% opacity
   - Hover state: surface-container-high/30

   _Status Badges:_
   - Published: emerald-500/10 background, emerald-400 text
   - Scheduled: primary/10 background, primary text
   - Draft: on-surface-variant/10 background, on-surface-variant text
   - Use uppercase tracking-wider for labels

   _Floating Action Button:_
   - Fixed bottom-right position
   - Gradient background (primary to primary-container)
   - Shadow: primary/20

---

## Agent Verification Checklist

Complete all checkpoints before proceeding to Phase 5:

- [ ] I have verified the admin dashboard layout matches ui_reference/admin_dashboard
- [ ] I have implemented the KPI cards grid with correct styling
- [ ] I have implemented the growth trajectory chart visualization
- [ ] I have implemented the traffic source distribution section
- [ ] I have verified the CMS manager layout matches ui_reference/admin_cms_manager
- [ ] I have implemented the post list with status badges (Published/Scheduled/Draft)
- [ ] I have implemented search and filter functionality
- [ ] I have implemented pagination
- [ ] I have created the sidebar navigation with active states
- [ ] I have applied DESIGN.md color palette throughout
- [ ] I have applied the "No-Line Rule" - no 1px borders
- [ ] I have implemented the floating action button (FAB)
- [ ] I have verified responsive behavior

---

## Testing & Validation

### Success Criteria

| Criteria                        | Validation Method                      |
| ------------------------------- | -------------------------------------- |
| Visual matches ui_reference     | Side-by-side comparison                |
| All KPI cards display correctly | Manual verification with sample data   |
| Navigation works                | Click through all admin links          |
| Post management functions       | Create, edit, delete posts through CMS |
| Search and filters work         | Test with various queries              |

### Automated Tests Required

- API integration tests for post CRUD
- Authentication tests for admin routes
- Input validation tests

---

## Dependencies

- Phase 2: Content Management & API Layer (completed)
- Phase 3: Public Blog Frontend (completed)

---

## Next Phase Preview

Phase 5 will implement the Post Editor, which is launched from the Admin Dashboard:

- Using ui_reference/post_editor as the primary visual reference
- Markdown editor with toolbar
- Metadata sidebar with settings
- Preview functionality
- Publishing options workflow
