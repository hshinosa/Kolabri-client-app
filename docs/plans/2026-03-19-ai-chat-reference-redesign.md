# AI Chat Reference Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the student AI chat page so its landing state feels much closer to the provided reference while preserving the existing chat/history/create/delete/send behavior.

**Architecture:** Keep all work scoped to the existing AI chat page component and reuse the current student design tokens already present in the app. The redesign should primarily change layout hierarchy, surface styling, and empty-state composition, while keeping the existing data flow and active conversation mechanics intact.

**Tech Stack:** React, Inertia, TypeScript, Tailwind utility classes, framer-motion, lucide-react, existing LiquidGlassCard / button helpers.

---

### Task 1: Rework the page shell into a reference-inspired layout

**Files:**
- Modify: `resources/js/pages/student/ai-chat/index.tsx`

**Step 1: Update shell constants and top-level layout structure**

- Keep the page in the same file.
- Replace the current sidebar-first composition with a layout that supports:
  - slim left utility rail / history access
  - minimalist top bar
  - centered hero content area
  - bottom floating composer dock
- Keep all existing state variables and chat actions unless a rename is needed for clarity.

**Step 2: Simplify and brighten the background treatment**

- Use a lighter gradient closer to the reference feel.
- Keep the palette inside the existing student design system:
  - heading text `#4A4A4A`
  - muted body text `#6B7280` / `#4B5563`
  - accent `#88161c`
- Avoid dark panels and avoid introducing a brand-new component system.

**Step 3: Reframe sidebar/history as supporting UI, not dominant UI**

- Keep back navigation, new chat, existing chat links, and delete functionality.
- Reduce visual dominance of the history panel.
- If needed, make the history panel feel more like a slim rail + expandable surface than a heavy permanent sidebar.

**Step 4: Verify the page still renders with existing props/state**

Run: inspect TypeScript errors after the structural refactor.
Expected: component still compiles conceptually with unchanged routing/form behavior.

### Task 2: Replace the empty state with a centered assistant hero

**Files:**
- Modify: `resources/js/pages/student/ai-chat/index.tsx`

**Step 1: Build the new hero heading block**

- Add a small assistant label/top identity line.
- Add a large centered greeting headline personalized to the student name.
- Add a short supporting line beneath it.

**Step 2: Add a right-side assistant focal visual**

- Use the simplest valid implementation inside the current codebase:
  - emoji / icon / styled assistant badge / illustration-like composition made from existing primitives.
- Do not add new assets or external dependencies.

**Step 3: Add a speech-bubble style callout near the assistant visual**

- Keep the copy short.
- Make it visually similar to the reference without literal cloning.

**Step 4: Replace the old prompt suggestion area with 3 large feature cards**

- Each card should include:
  - icon treatment
  - short title/body copy
  - small footer label
- Clicking a card should still help the user start a chat, preferably by prefilling the current input.

**Step 5: Verify empty-state hierarchy**

Expected:
- empty state feels like a premium assistant landing page
- greeting is the primary focus
- cards are visually stronger than the previous suggestion chip grid

### Task 3: Convert the composer into a floating assistant dock

**Files:**
- Modify: `resources/js/pages/student/ai-chat/index.tsx`

**Step 1: Rebuild the composer shell**

- Keep the existing textarea, submit handler, Enter behavior, and processing state.
- Restyle the container into a large rounded floating dock near the bottom center.

**Step 2: Add a secondary row of quick action pills**

- Use a visual treatment similar to the reference, but with project-consistent styling.
- Actions can prefill the input if they are not tied to real backend capabilities.
- Do not invent unsupported backend functionality.

**Step 3: Keep send affordance prominent**

- Preserve current send-button behavior.
- Ensure the dock remains the main actionable UI element on the page.

**Step 4: Verify unchanged message submission behavior**

Manual QA target:
- type message
- press Enter to send
- use Shift+Enter for newline
- confirm create-chat flow still works when no active chat exists

### Task 4: Adapt active conversation mode to the new shell

**Files:**
- Modify: `resources/js/pages/student/ai-chat/index.tsx`

**Step 1: Keep all active-chat logic intact**

- Preserve:
  - message rendering
  - timestamps
  - auto-scroll
  - create new chat flow
  - existing chat navigation
  - delete chat flow

**Step 2: Restyle active messages to fit the redesigned shell**

- Keep user/assistant distinction clear.
- Use lighter, cleaner surfaces that match the new landing shell.
- Avoid reverting to dark or muddy bubble treatments.

**Step 3: Keep delete modal aligned with current student design language**

- Reuse existing glass / button treatments already available in helpers.

**Step 4: Verify state transitions**

Expected:
- empty state to active conversation transition feels coherent
- existing chat history remains accessible
- no feature regression in create/open/delete/send flows

### Task 5: Verification and polish pass

**Files:**
- Modify: `resources/js/pages/student/ai-chat/index.tsx`

**Step 1: Run TypeScript diagnostics**

Run: `lsp_diagnostics` on `resources/js/pages/student/ai-chat/index.tsx`
Expected: zero diagnostics

**Step 2: Run the project build**

Run the app build command from the client app root.
Expected: exit code 0

**Step 3: Manual QA on the real page**

Check all of the following on `/student/ai-chat`:
- empty landing state matches the new layout direction
- hero heading is readable and visually centered
- three cards are aligned and usable
- composer dock is prominent and functional
- opening existing chats still works
- deleting chat still works
- sending a new message still works

**Step 4: Responsive QA**

Check a narrower viewport.
Expected:
- no broken overlaps
- hero stacks cleanly
- composer remains usable
- side controls/history remain reachable

### Recommended commit message after implementation

```bash
git commit -m "redesign student ai chat landing experience"
```
