# Design System Document: The Luminal Editorial

## 1. Overview & Creative North Star

**Creative North Star: The Digital Curator**

This design system moves beyond the cold, impersonal aesthetic of "tech" and enters the realm of "high-end editorial." It is designed for a blogging platform where the content is prestigious and the interface is a silent, sophisticated gallery.

We break the "template" look through **Intentional Asymmetry**. Instead of rigid, centered grids, we utilize generous whitespace and staggered content blocks to create a rhythmic flow. By layering semi-transparent surfaces and utilizing deep tonal depth, we create a "Bleeding Edge" feel that is human-centric, professional, and avoids the clichés of "cyberpunk" or "terminal" aesthetics.

---

## 2. Colors & Surface Logic

The palette is rooted in deep, atmospheric charcoals (`#131315`), providing a canvas where high-tech accents can breathe without overwhelming the reader.

### The "No-Line" Rule

**Explicit Instruction:** Traditional 1px solid borders for sectioning are strictly prohibited. Boundaries must be defined solely through background color shifts or subtle tonal transitions. For example, a sidebar should be `surface-container-low` sitting against a `background` main stage.

### Surface Hierarchy & Nesting

Treat the UI as a series of physical layers—stacked sheets of obsidian and smoked glass.

- **Base Layer:** `surface` (#131315)
- **Secondary Content:** `surface-container-low` (#1b1b1d)
- **Interactive Cards:** `surface-container` (#201f21)
- **Floating Overlays:** `surface-container-highest` (#353437) with 80% opacity and 20px Backdrop Blur.

### The "Glass & Gradient" Rule

To achieve a signature "soul," use subtle linear gradients for primary actions. Instead of a flat violet, use a transition from `primary` (#d2bbff) to `primary-container` (#7c3aed) at a 135-degree angle. This adds a physical "glow" that feels premium and intentional.

---

## 3. Typography: The Editorial Voice

We utilize a dual-typeface system to balance technical precision with readability. All labels and headers must use **Sentence Case** or **Title Case**. Never use `SCREAMING_SNAKE_CASE`.

- **Display & Headlines (Manrope):** Chosen for its geometric purity and modern warmth. Large scales (3.5rem for `display-lg`) should be used with tight letter-spacing (-0.02em) to create an authoritative, editorial impact.
- **Body & Titles (Inter):** The workhorse of the system. Inter provides maximum legibility for long-form reading.
- **Status Indicators:** Use "Human-Readable" status markers. Replace "SYNC_COMPLETE" with "All systems active" or "Live updates enabled" using `label-md`.

---

## 4. Elevation & Depth

Depth in this system is achieved through **Tonal Layering**, not structural lines.

- **The Layering Principle:** Stacking tiers creates natural lift. Place a `surface-container-lowest` (#0e0e10) card on a `surface-container-low` (#1b1b1d) section to create a recessed, "carved" look.
- **Ambient Shadows:** If a floating effect is required (e.g., a dropdown), use a shadow with a 40px blur at 6% opacity, tinted with the `primary` color (#d2bbff). This mimics natural light refracting through glass.
- **The "Ghost Border" Fallback:** If a container requires a border for accessibility, use the `outline-variant` token (#4a4455) at **15% opacity**. It should be felt, not seen.
- **Glassmorphism:** For top navigation bars or floating action buttons, use `surface-container-high` at 70% opacity with a `backdrop-filter: blur(12px)`.

---

## 5. Components

### Buttons

- **Primary:** Gradient fill (`primary` to `primary-container`), 8px radius (`lg`), `label-md` (Inter). No border.
- **Secondary:** `surface-container-highest` background. Subtle "Ghost Border" at 15% opacity.
- **Tertiary:** Ghost style. Text only in `primary` color, with a subtle underline appearing only on hover.

### Input Fields

- **Visuals:** Forgo the four-sided box. Use a `surface-container-low` fill with a 2px bottom-accent in `outline-variant`.
- **States:** On focus, the bottom accent transitions to `primary` (#d2bbff) with a subtle outer glow (4px blur).

### Cards & Lists

- **Rule:** Forbid the use of divider lines.
- **Implementation:** Separate list items using `8` (2rem) from the Spacing Scale. For cards, use a slight color shift from `surface` to `surface-container-low` on hover to indicate interactivity.

### Featured Blog Header (Signature Component)

- An asymmetrical layout where the `display-md` headline overlaps the edge of a `primary-container` image mask. This breaks the grid and creates a custom, high-end magazine feel.

---

## 6. Do’s and Don’ts

### Do

- **Do** use `16` (4rem) or `20` (5rem) spacing to separate major content themes.
- **Do** use human-centric language: "Great to see you again" instead of "User Authenticated."
- **Do** ensure all interactive elements have a minimum corner radius of `0.25rem` (4px).

### Don't

- **Don't** use pure black (#000). It kills the "glass" effect and creates harsh contrast.
- **Don't** use 1px solid white or grey lines to separate content.
- **Don't** use "terminal-speak" or monospace fonts for anything other than actual code snippets.
- **Don't** use standard drop shadows. Always use the tinted Ambient Shadow approach.
