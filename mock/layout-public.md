This is the layout description for all non-account pages except Auth pages. The entire nav, content, and footer are size-constrained and center-aligned (equal side margins).

---

# Page Background

## Light Mode

The outermost page background is white. The content area has a slightly darker (light gray/off-white) background to visually separate it from the nav and footer.

## Dark Mode

The nav and footer share a dark charcoal/gray background. The content area is near-black (darker than the nav/footer) to maintain the same contrast relationship as light mode. All text inverts to light colors (white for headings/bold text, muted light gray for secondary text and links).

---

# Navigation

Top nav bar across the full viewport width. All non-Auth pages share this nav. Light mode: white background with a thin light gray bottom border (1px). Dark mode: dark charcoal background with a thin darker border (1px).

## Desktop Layout

Three sections in a single horizontal row:

- **Left**: "Pantolingo" wordmark (bold, large text — serves as the logo/home link)
- **Center-left** (immediately after the logo, left-aligned): Main nav links in regular weight, muted gray text
    1. Home
    2. Features
    3. Pricing
- **Right** (pushed to the far right): Utility items
    - Light/dark mode toggle icon (sun icon in light mode, moon/crescent icon in dark mode)
    - Auth state controls:
        - **Logged out**: "Login" (text link) + "Sign Up" (outlined button)
        - **Logged in**: "Account" (outlined/bordered button)

## Mobile Layout

The nav collapses to two elements:

- **Left**: "Pantolingo" wordmark (bold)
- **Right**: Light/dark mode toggle icon (sun/moon) + hamburger menu icon (three horizontal lines)

The main nav links (Home, Features, Pricing) and auth controls are hidden behind the hamburger menu.

---

# Content

Occupies the full vertical space between the nav and footer (min-height fills viewport). Content has horizontal padding from the page edges. Light mode: light gray/off-white background. Dark mode: near-black background (darker than the nav/footer).

---

# Footer

Separated from the content area by a thin top border (1px). Light mode: white background, light gray border. Dark mode: dark charcoal background (same as nav), darker border.

## Desktop Layout

Three-column horizontal layout:

- **Left column**: Brand info
    - "Pantolingo" wordmark (bold)
    - "(c) 2026 Pantolingo. All rights reserved." (muted gray text)
- **Center column**: Navigation links
    - "Navigation" heading (bold)
    - Home
    - Features
    - Pricing
- **Right column**: Legal links
    - "Legal" heading (bold)
    - Privacy
    - Terms
    - Contact

## Mobile Layout

Single-column stacked layout (all left-aligned):

1. "Pantolingo" wordmark (bold)
2. "(c) 2026 Pantolingo. All rights reserved." (muted gray text)
3. _(spacing)_
4. "Navigation" heading (bold)
    - Home
    - Features
    - Pricing
5. _(spacing)_
6. "Legal" heading (bold)
    - Privacy
    - Terms
    - Contact
