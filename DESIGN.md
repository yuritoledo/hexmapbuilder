---
name: Hexmap Builder
description: Bestiário vivo — an artisanal monochrome workspace around two preserved A4 sheets.
colors:
  ink: "#151515"
  muted: "#505050"
  line: "#bcbcbc"
  white: "#ffffff"
  hover: "#ededed"
  primary-hover: "#3b3b3b"
  field-line: "#777"
  placeholder: "#616161"
  disabled: "#666"
  map-hover: "#f1f1f1"
  map-selected: "#e9e9e9"
  arrival: "#888"
  paper-ink: "#252720"
  paper-muted: "#5b5e53"
  paper-line: "#d4d7cb"
  paper-grid: "#767a6e"
  print-ink: "#000000"
  print-line: "#aaa"
typography:
  display:
    fontFamily: "Eczar Variable, Georgia, serif"
    fontSize: "44px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  wordmark:
    fontFamily: "Eczar Variable, Georgia, serif"
    fontSize: "35px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Eczar Variable, Georgia, serif"
    fontSize: "27px"
    fontWeight: 600
    lineHeight: 1.2
  coordinate:
    fontFamily: "Eczar Variable, Georgia, serif"
    fontSize: "34px"
    fontWeight: 500
    lineHeight: 1.3
  body:
    fontFamily: "Source Sans 3 Variable, Helvetica Neue, sans-serif"
    fontSize: "16px"
    lineHeight: 1.5
  label:
    fontFamily: "Source Sans 3 Variable, Helvetica Neue, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.35
  button:
    fontFamily: "Source Sans 3 Variable, Helvetica Neue, sans-serif"
    fontSize: "15px"
    lineHeight: 1.35
  supporting:
    fontFamily: "Source Sans 3 Variable, Helvetica Neue, sans-serif"
    fontSize: "14px"
    lineHeight: 1.5
  paper-title:
    fontFamily: "Literata Variable, Georgia, serif"
    fontSize: "6px"
    fontWeight: 450
    letterSpacing: "-0.1px"
  paper-coordinate:
    fontFamily: "Literata Variable, Georgia, serif"
    fontSize: "2.5px"
  paper-body:
    fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif"
  print-key:
    fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "9.2pt"
    lineHeight: 1.32
rounded:
  control: "0"
spacing:
  action-gap: "8px"
  field-gap: "6px"
  field-stack: "14px"
  section: "24px"
  workspace-gap: "30px"
  page-gutter: "36px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "9px 13px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "9px 13px"
  button-secondary-hover:
    backgroundColor: "{colors.hover}"
  field:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px 10px"
  selected-coordinate:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    typography: "{typography.coordinate}"
    padding: "2px 12px"
---

# Design System: Hexmap Builder

## Overview

- **Creative North Star: "Bestiário vivo"**
- The workspace reads like a living bestiary: expressive serif headings, black rules, plain fields and a region ready to inspect. White paper and dark ink support preparation on a computer and consultation on a phone.
- The identity changes the workspace, not the product name or the map's visual language. The two A4 sheets keep their original typography, symbols, geometry and print rules. The approved code-led direction is `.impeccable/mocks/decision/assigned.html`; the built source takes precedence over the mock.
- **Key Characteristics:**
  - Artisanal headings with clear sans-serif controls.
  - A white workspace with black actions and gray support.
  - A selected coordinate printed as a black block beside the map.
  - Separate screen and paper systems.
- Source of truth: `src/main.ts` imports `src/style.css`, then `src/workspace.css`. The latter applies only to screens. The direction contract lives in `.impeccable/surfaces/src-main-ts.md`.

## Colors

- The workspace uses a restrained neutral palette without a chromatic action accent.

### Primary

- **Ink** marks actions, headings, focus and the selected coordinate.
- **Primary hover** lightens filled action buttons without changing their white labels.

### Neutral

- **White** is the canvas, paper and field background.
- **Muted** carries supporting instructions. **Line** separates sections.
- **Field line** defines input edges. **Placeholder** keeps example text readable. **Disabled** combines gray text with a disabled control state and a changed cursor.
- **Hover** marks outlined buttons. **Map hover** and **map selected** provide screen-only cell fills.
- **Arrival** appears only in the coordinate's brief inset-shadow animation.
- **Paper ink**, **paper muted**, **paper line** and **paper grid** preserve the original sheet vocabulary. These are not replacement workspace tokens.
- **Print ink** and **print line** serve the referee key. Do not replace its black text with workspace muted text.
- **The Two Inks Rule.** Workspace ink does not recolor the original map symbols or printed sheets.
- **The More Than Color Rule.** Keep solid selected borders, dashed keyboard focus, readable coordinates and named controls. Color alone does not identify terrain, focus or selection.

## Typography

- **Display font:** Eczar Variable with Georgia and serif fallbacks.
- **Workspace body font:** Source Sans 3 Variable with Helvetica Neue and sans-serif fallbacks. The workspace base line height is 1.45; descriptive text commonly uses 1.5.
- **Paper fonts:** Literata Variable for map titles, coordinates and the print-key heading (450, 20pt); Helvetica Neue, Helvetica, Arial and sans-serif for paper text. Key section headings use Georgia at 12pt.
- Local font packages supply all three families. Keep `public/OFL-eczar.txt`, `public/OFL-source-sans-3.txt` and `public/OFL-Literata.txt` with them.

### Hierarchy

- **Display:** the opening heading uses the display token. At 900px and below it uses 32px.
- **Wordmark:** the product name uses the wordmark token. At 900px and below it uses 30px.
- **Headline:** preparation and consultation headings use the headline token. The print-options legend uses 23px/1.2; the regional-key summary uses 25px/1.3, both weight 600.
- **Coordinate:** the selected cell uses the coordinate token with tabular numerals. It is not an uppercase label or decorative badge.
- **Body:** consultation and introductory text use 16px. The introduction has a 75ch maximum; on small screens it uses 15px.
- **Labels and controls:** field labels use the label token. Fields use 16px at all screen sizes. Buttons use the button token; header actions use 14px at 900px and below.
- **Supporting:** help and status text generally use the supporting token. Sheet captions use 13px on screen.
- **Paper:** SVG sizes are in the 210 × 297 viewBox. The paper-coordinate token corresponds to 2.5mm at actual print size, not a 2.5px workspace label.
- **The Two Type Systems Rule.** Use Eczar and Source Sans 3 for workspace additions. Preserve Literata and Helvetica inside the original paper output.

## Layout

- Header and main content have a maximum width of 1540px. Desktop side gutters are 36px.
- The introduction ends with a 3px ink rule. It separates the shared header from the working area.
- The desktop workspace has preparation (225px), a flexible map column and consultation (252px), with 30px gaps. Preparation has a right divider and 22px right padding.
- The map preview has a maximum width of 500px and stays centered in its column. Its SVG geometry does not change with preview size.
- From 901px through 1100px, side gutters become 24px. The side columns become 195px and 215px, with 20px gaps.
- At 900px and below, side gutters become 18px. The header wraps. The workspace becomes one column: map, consultation, preparation. Preparation uses a top divider instead of a right divider.
- Small screens expose the Mapa, Consultar and Gerar anchor links. Each link has a minimum height of 44px. Anchor targets have a 20px scroll offset. Selecting a cell brings its entry into view at this breakpoint.
- The regional key sits below the workspace and keeps horizontal table scrolling on narrow screens.
- The inherited 650px rules still hide the inspector's second `section` if one exists. The current inspector contains one section plus details elements; this is not a second screen layout breakpoint.
- Preserve the map's 9 × 12 pointy-top hexagons, 108 coordinates, minimum 12mm margins and 10km adjacent-center scale.
- The default region prints on two A4 portrait pages. Long edited content can require additional pages. The map is 210 × 297mm with zero page margin. The key has 12mm page margins and a 186mm content width.
- The key has four columns of 27 rows with 4mm gaps. Body rows are 3.65mm high; headers are 5mm high. Coordinate columns are 15mm; danger columns are 10mm. A separate two-column list prints full local categories and names, including the permanent base. Shared blank handwriting space uses the remaining height, with a 40mm minimum.
- Full names and metadata wrap in print without ellipses. The screen key and exported data also retain full values.

## Elevation & Depth

- Screen surfaces are flat. Rules, spacing and black blocks establish hierarchy. The screen stylesheet removes the inherited paper shadow; print also removes it.
- **Coordinate arrival:** an inset shadow moves from `inset 0 -5px 0 #888` to `inset 0 0 0 #888` over 220ms with `cubic-bezier(.16, 1, .3, 1)`.
- The animation runs only under `prefers-reduced-motion: no-preference`. The coordinate stays in place; the effect does not translate the label.
- Static review images do not verify motion. Do not infer additional hover transitions or entrance effects from them.
- **The Ink Arrival Rule.** Keep the coordinate's brief inset effect separate from permanent elevation. Do not add lifted cards to imitate it.

## Shapes

- Workspace buttons and fields have square corners. Borders are generally 1px. Consultation begins with a 5px ink rule.
- The selected coordinate is a rectangular ink block, not a rounded chip.
- The original map uses regular pointy-top hexagons with alternating offset rows. Its boundary uses a 0.3-unit dotted stroke with round caps.
- Terrain, danger, optional-location and base symbols remain the existing vectors. Do not replace them with text glyphs or new illustrations.
- Selected cells keep a solid 0.65-unit boundary; keyboard focus uses a 0.8-unit dashed boundary. Print resets all interactive boundaries to the original dotted grid and white fill.

## Components

### Buttons

- Filled ink buttons identify generation and printing. Other actions use white fill and ink outlines. Both variants keep visible text labels.
- Buttons have a minimum height of 44px. The print button retains its inherited minimum height of 48px.
- Outlined buttons use the hover token; filled buttons use primary hover. Disabled buttons use disabled text, line borders and a not-allowed cursor.
- Focus uses a 2px ink outline with a 4px offset. No general button transition is declared.

### Inputs / Fields

- Native inputs and selects keep visible labels, square corners, white fill, field-line borders and a minimum height of 44px.
- Carets and checkbox accents use ink. Text selection uses ink with white text. Placeholders remain opaque.
- The import label acts as an outlined button around a visually hidden native file input. Its focus-within ring matches button focus. During import, the field is disabled and the wrapper uses a wait cursor.

### Navigation

- The wordmark remains “Hexmap Builder”. Header actions wrap rather than collapse into an icon-only menu.
- The small-screen workspace navigation uses plain underlined text links, not filled tabs. The skip link becomes visible on keyboard focus.

### Containers and disclosures

- Preparation and consultation use dividers, not rounded cards. Details elements retain their native disclosure markers and readable text summaries.
- The regional-key table uses ruled rows and tabular numerals. It is collapsible on screen and separate from the printed key.

### Selected entry

- Before selection, consultation gives an explicit instruction. A selection reveals the coordinate block, terrain symbol and name, column, row, scale, danger, optional local and permanent base when present.
- The selected coordinate uses white text, ink fill and 2px 12px padding. The selection container is a polite, atomic live region.
- Keep keyboard focus separate from selected state. Arrow keys move focus; Enter or Space selects. Home and End move within the row.

### Save status and recovery

- Save and file messages use text status regions, not color-only alerts.
- “Tentar salvar novamente” appears only after a save or restore failure. It uses the outlined button style, fills its column and has 12px top margin.
- A blocked restore preserves the old saved data. Retrying asks for confirmation before replacing it. A successful save hides the recovery button.

### Paper output

- Print hides the workspace and creates a separate map and referee key. The map preserves its metadata, original symbol grammar and 50mm calibration line.
- Print secrecy controls remain independent. The key retains all hexagons, regardless of hidden locations or danger on the player map.
- Keep the handwritten Obs. column empty. Preserve print-only ellipsis and full digital names.

## Do's and Don'ts

### Do:

- **Do** keep the workspace white and its controls monochrome.
- **Do** preserve the separate screen and paper type systems.
- **Do** keep selected state and keyboard focus visible without color alone.
- **Do** preserve the two A4 pages and full digital data.
- **Do** show save failures in text and keep the retry action conditional.
- **Do** respect reduced motion for the coordinate arrival.

### Don't:

- **Don't** recolor or retype the paper to match workspace tokens.
- **Don't** replace terrain symbols with decorative glyphs or new illustrations.
- **Don't** turn preparation and consultation into elevated rounded cards.
- **Don't** turn print-only truncation into lost screen or export data.
- **Don't** describe a static capture as proof of motion or accessibility behavior.

- Evidence supplied for this documentation pass: `.impeccable/review/desktop.png`, `.impeccable/review/mobile.png`, `.impeccable/review/desktop-selected.png` and `.impeccable/review/mobile-selected.png`. The final review reports ship at the scored fix scope after the retry-save correction; listed material items are clear and selected-coordinate appearance is confirmed.
- Reported verification: 119 Playwright tests, 121 changed Vitest tests, typecheck, lint, build and diff checks pass. This documentation pass does not rerun those checks. Physical printing, non-Chromium browsers and screen readers remain unverified.
- Not canonized: the obsolete workspace palette, Literata workspace headings, rounded controls and permanent preview shadow are superseded, not new rules. No unresolved material defect is reported in the final review; detector advisories against the old DESIGN are not independent evidence of a new defect.
