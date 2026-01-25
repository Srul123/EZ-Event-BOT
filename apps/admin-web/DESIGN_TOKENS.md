# Design Tokens & Style Guidelines

This document outlines the design token system and UI/UX guidelines for the EZ-Event Admin web application.

## Table of Contents

1. [Color System](#color-system)
2. [Typography](#typography)
3. [Spacing](#spacing)
4. [Layout & Responsive Design](#layout--responsive-design)
5. [Components](#components)
6. [Accessibility](#accessibility)
7. [Best Practices](#best-practices)

---

## Color System

### Primary Colors
The primary color palette is based on a blue-purple gradient scheme that represents trust and professionalism.

- **Primary 50-950**: Full scale from lightest to darkest
- **Primary 500** (`#667eea`): Main brand color - use for primary actions, links, and key UI elements
- **Primary 600** (`#5a67d8`): Hover states for primary elements
- **Primary 700** (`#4c51bf`): Active/pressed states

**Usage:**
```vue
<button class="bg-primary-500 hover:bg-primary-600 active:bg-primary-700">
  Primary Button
</button>
```

### Secondary Colors
Complementary purple tones for secondary actions and accents.

- **Secondary 500** (`#764ba2`): Secondary brand color
- Use for secondary buttons, accents, and supporting elements

### Semantic Colors

#### Success (Green)
- Use for: Success messages, completed states, positive actions
- **Success 500** (`#22c55e`): Main success color

#### Warning (Amber/Yellow)
- Use for: Warnings, caution states, pending actions
- **Warning 500** (`#f59e0b`): Main warning color

#### Error (Red)
- Use for: Error messages, destructive actions, validation errors
- **Error 500** (`#ef4444`): Main error color

#### Info (Blue)
- Use for: Informational messages, neutral notifications
- **Info 500** (`#3b82f6`): Main info color

### Neutral Colors
Grayscale palette for text, backgrounds, and borders.

- **Neutral 50** (`#fafafa`): Lightest background
- **Neutral 100** (`#f5f5f5`): Light background
- **Neutral 200** (`#e5e5e5`): Borders, dividers
- **Neutral 500** (`#737373`): Secondary text
- **Neutral 700** (`#404040`): Primary text
- **Neutral 900** (`#171717`): Darkest text

**Text Color Guidelines:**
- Primary text: `text-neutral-900` or `text-neutral-700`
- Secondary text: `text-neutral-500`
- Disabled text: `text-neutral-400`

---

## Typography

### Font Families

**Sans Serif (Default):**
- System font stack for optimal performance
- Includes: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, etc.

**Monospace:**
- Use for: Code, technical data, IDs
- Class: `font-mono`

### Font Sizes

Our typography scale follows a fluid, responsive system:

| Size | Class | Pixels | Use Case |
|------|-------|--------|----------|
| xs | `text-xs` | 12px | Labels, captions |
| sm | `text-sm` | 14px | Secondary text, helper text |
| base | `text-base` | 16px | Body text (default) |
| lg | `text-lg` | 18px | Emphasized body text |
| xl | `text-xl` | 20px | Small headings |
| 2xl | `text-2xl` | 24px | Section headings |
| 3xl | `text-3xl` | 30px | Page titles |
| 4xl | `text-4xl` | 36px | Hero headings |
| 5xl+ | `text-5xl`+ | 48px+ | Display text |

### Font Weights

- `font-thin` (100): Rarely used
- `font-light` (300): Light emphasis
- `font-normal` (400): Default body text
- `font-medium` (500): Medium emphasis
- `font-semibold` (600): Headings, emphasis
- `font-bold` (700): Strong emphasis, important headings
- `font-extrabold` (800): Display text
- `font-black` (900): Rarely used

### Line Heights

Automatically included with font sizes:
- Tight: 1.25 (headings)
- Normal: 1.5 (body text)
- Relaxed: 1.75 (spacious text)

---

## Spacing

### Spacing Scale (8px Base Unit)

Our spacing system uses an 8px base unit for consistency:

| Size | Class | Pixels | Use Case |
|------|-------|--------|----------|
| 0 | `p-0`, `m-0` | 0px | Reset spacing |
| 1 | `p-1`, `m-1` | 4px | Tight spacing |
| 2 | `p-2`, `m-2` | 8px | Small spacing |
| 3 | `p-3`, `m-3` | 12px | Medium-small |
| 4 | `p-4`, `m-4` | 16px | Medium (default) |
| 6 | `p-6`, `m-6` | 24px | Large spacing |
| 8 | `p-8`, `m-8` | 32px | Extra large |
| 12 | `p-12`, `m-12` | 48px | Section spacing |
| 16 | `p-16`, `m-16` | 64px | Page spacing |

### Spacing Guidelines

- **Padding**: Use for internal spacing within components
- **Margin**: Use for external spacing between components
- **Gap**: Use with flexbox/grid for consistent spacing between children

**Example:**
```vue
<div class="p-6 mb-4">
  <div class="flex gap-4">
    <button>Button 1</button>
    <button>Button 2</button>
  </div>
</div>
```

---

## Layout & Responsive Design

### Breakpoints

Tailwind's default responsive breakpoints:

| Breakpoint | Min Width | Class Prefix | Use Case |
|------------|-----------|--------------|----------|
| sm | 640px | `sm:` | Small tablets |
| md | 768px | `md:` | Tablets |
| lg | 1024px | `lg:` | Laptops |
| xl | 1280px | `xl:` | Desktops |
| 2xl | 1536px | `2xl:` | Large desktops |

### Mobile-First Approach

Always design for mobile first, then enhance for larger screens:

```vue
<div class="
  flex flex-col          <!-- Mobile: column -->
  md:flex-row           <!-- Tablet+: row -->
  gap-4                 <!-- Consistent gap -->
  p-4                   <!-- Mobile padding -->
  md:p-6                <!-- Tablet+ padding -->
">
```

### Container Widths

Use the custom container class for consistent max-widths:

```vue
<div class="container-custom">
  <!-- Content max-width: 1280px, centered with responsive padding -->
</div>
```

### Grid System

Use Tailwind's grid utilities for layouts:

```vue
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <!-- Responsive grid: 1 col mobile, 2 tablet, 3 desktop -->
</div>
```

---

## Components

### Buttons

Pre-built button classes are available:

```vue
<!-- Primary Button -->
<button class="btn btn-primary px-6 py-3">
  Primary Action
</button>

<!-- Secondary Button -->
<button class="btn btn-secondary px-6 py-3">
  Secondary Action
</button>

<!-- Outline Button -->
<button class="btn btn-outline px-6 py-3">
  Outline Action
</button>

<!-- Ghost Button -->
<button class="btn btn-ghost px-6 py-3">
  Ghost Action
</button>
```

**Button Sizes:**
- Small: `px-4 py-2 text-sm`
- Medium (default): `px-6 py-3 text-base`
- Large: `px-8 py-4 text-lg`

### Cards

```vue
<!-- Standard Card -->
<div class="card">
  <h3 class="text-xl font-semibold mb-4">Card Title</h3>
  <p>Card content...</p>
</div>

<!-- Elevated Card -->
<div class="card-elevated">
  <h3 class="text-xl font-semibold mb-4">Elevated Card</h3>
  <p>Card content with more shadow...</p>
</div>
```

### Inputs

```vue
<input 
  type="text" 
  class="input" 
  placeholder="Enter text..."
/>

<textarea 
  class="input min-h-[120px] resize-y"
  placeholder="Enter message..."
></textarea>
```

---

## Accessibility

### Focus States

All interactive elements have visible focus states:
- Ring: 2px primary color ring
- Offset: 2px ring offset for better visibility

### Color Contrast

- Text on light backgrounds: Use `neutral-700` or `neutral-900`
- Text on colored backgrounds: Ensure WCAG AA contrast (4.5:1)
- Interactive elements: Use sufficient contrast for hover/active states

### Semantic HTML

- Use proper heading hierarchy (h1 → h2 → h3)
- Use semantic elements: `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`
- Include ARIA labels where needed

### Keyboard Navigation

- All interactive elements should be keyboard accessible
- Use logical tab order
- Provide skip links for main content

---

## Best Practices

### Logical Properties

Use logical properties for RTL (Right-to-Left) language support:

- `start`/`end` instead of `left`/`right`
- `inset-inline-start` instead of `left`
- `text-start`/`text-end` instead of `text-left`/`text-right`

**Example:**
```vue
<div class="ps-4 text-start">
  <!-- padding-inline-start, text-align: start -->
</div>
```

### Performance

- Use Tailwind's JIT (Just-In-Time) mode (enabled by default)
- Only classes you use are included in the final CSS
- Avoid inline styles when Tailwind classes are available

### Consistency

- Use design tokens consistently across the application
- Follow the spacing scale (8px base unit)
- Maintain consistent border radius (6px default, 12px for cards)
- Use consistent shadow levels for elevation

### Responsive Design Checklist

- ✅ Test on mobile (320px+)
- ✅ Test on tablet (768px+)
- ✅ Test on desktop (1280px+)
- ✅ Use fluid typography where appropriate
- ✅ Ensure touch targets are at least 44x44px on mobile
- ✅ Test with keyboard navigation
- ✅ Verify focus states are visible

### Component Patterns

1. **Composition over Configuration**: Build complex components from simple utilities
2. **Consistent Spacing**: Use the spacing scale consistently
3. **Semantic Colors**: Use semantic color names (success, error) over raw colors
4. **Responsive by Default**: Design mobile-first, enhance for larger screens

---

## Quick Reference

### Common Patterns

**Centered Container:**
```vue
<div class="container-custom">
  <!-- Content -->
</div>
```

**Flexbox Layout:**
```vue
<div class="flex items-center justify-between gap-4">
  <!-- Items -->
</div>
```

**Responsive Grid:**
```vue
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <!-- Items -->
</div>
```

**Card with Header:**
```vue
<div class="card">
  <div class="flex items-center justify-between mb-4">
    <h3 class="text-xl font-semibold">Title</h3>
    <button class="btn btn-ghost">Action</button>
  </div>
  <!-- Content -->
</div>
```

---

## Resources

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [WCAG Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Material Design Guidelines](https://material.io/design)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)

---

**Last Updated:** January 2026
**Version:** 1.0.0
