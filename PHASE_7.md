# Phase 7: SEO, RSS & Theme System

## Objective

Implement the discovery and customization features for OpenBlog, including search engine optimization, RSS feed generation, and a robust theming system. This phase ensures content is discoverable by search engines and other agents while providing users with visual customization options.

---

## Scope

### Deliverables

1. **SEO Optimization**
   - Automated sitemap generation (sitemap.xml)
   - Robots.txt configuration
   - Dynamic meta tags for each page
   - OpenGraph tags for social sharing
   - Twitter Card metadata
   - Structured data (JSON-LD) for articles

2. **RSS Feed**
   - Full XML RSS feed generation
   - Atom feed alternative
   - Category-specific feeds
   - Auto-discovery link in HTML head

3. **Theme System**
   - Multiple preset themes
   - Theme toggle via Admin Panel
   - Theme toggle via API/CLI
   - Theme configuration storage
   - CSS custom properties for theming

4. **Enhanced Meta Management**
   - Per-post SEO description
   - Custom slugs
   - Tag management for SEO
   - Canonical URLs

---

## UI/UX Governance

**This phase has UI components for theme selection.**

### Theme System Guidelines

The theme system must maintain the DESIGN.md "Digital Curator" aesthetic while allowing customization:

1. **Theme Presets Must Include:**
   - The default dark theme (per DESIGN.md)
   - At least 2-3 alternative presets
   - All presets must follow the "No-Line Rule"
   - All presets must use Manrope/Inter typography
   - All presets must maintain surface hierarchy

2. **Theme Toggle UI:**
   - Use DESIGN.md component styles
   - Gradient primary button for active selection
   - Surface hierarchy for theme cards
   - Preview thumbnails for each theme

3. **API Controls:**
   - Theme selection via Admin Panel
   - Theme selection via API endpoint
   - Theme selection via CLI

---

## Agent Verification Checklist

Complete all checkpoints before proceeding to Phase 8:

- [ ] I have implemented automated sitemap.xml generation
- [ ] I have implemented robots.txt
- [ ] I have implemented dynamic meta tags for all pages
- [ ] I have implemented OpenGraph and Twitter Card metadata
- [ ] I have implemented JSON-LD structured data for articles
- [ ] I have implemented RSS XML feed
- [ ] I have implemented Atom feed alternative
- [ ] I have implemented RSS auto-discovery
- [ ] I have implemented theme preset system
- [ ] I have implemented theme toggle via Admin Panel
- [ ] I have implemented theme toggle via API
- [ ] I have implemented theme toggle via CLI
- [ ] I have implemented per-post SEO configuration
- [ ] I have verified sitemaps are valid

---

## Testing & Validation

### Success Criteria

| Criteria                       | Validation Method                     |
| ------------------------------ | ------------------------------------- |
| Sitemap is valid               | Test with Google Sitemap Validator    |
| RSS feed is valid              | Test with RSS validator               |
| Social cards display correctly | Test with Facebook/Twitter validators |
| Theme switching works          | Toggle themes and verify              |
| SEO meta tags present          | View page source                      |

### Manual Verification

- Submit sitemap to Google Search Console
- Test RSS feed in feed reader
- Test OpenGraph preview on social media
- Test each theme preset renders correctly

---

## Technical Notes

- Use next-sitemap or similar for sitemap generation
- Use feed library for RSS/Atom generation
- Store themes as CSS custom properties
- Implement theme switching without page reload
- Cache generated sitemaps and feeds

---

## Dependencies

- Phase 3: Public Blog Frontend (completed)
- Phase 5: Post Editor (completed)

---

## Next Phase Preview

Phase 8 will implement Docker & Deployment:

- Production-ready docker-compose.yaml
- Multi-stage Docker builds
- Environment configuration
- Health checks
- Deployment documentation
