# Migrate Landing Page, Login, and Register Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Copy landing page, login, and register functionality from `C:\Code\Kolabri\Kolabri\client-app` to `C:\Code\testt\Kolabri-client-app`

**Architecture:** 
- Source uses glass morphism design with Framer Motion animations
- Custom UI components (LiquidGlassCard, PrimaryButton, PasswordInput, etc.)
- Theme context for dark/light mode
- Target uses Laravel + React + Inertia.js setup

**Tech Stack:** React, TypeScript, Tailwind CSS, Framer Motion, Inertia.js, Lucide React

---

## Phase 1: Copy Welcome Components

### Task 1.1: Create Welcome Components Directory Structure

**Files:**
- Create directory: `resources/js/components/Welcome/`
- Create directory: `resources/js/components/Welcome/utils/`

**Step 1: Create directories**

Run: `mkdir -p resources/js/components/Welcome/utils`

---

### Task 1.2: Copy LandingPageContent.tsx

**Files:**
- Create: `resources/js/components/Welcome/LandingPageContent.tsx`
- Source: `C:\Code\Kolabri\Kolabri\client-app\resources\js\components\Welcome\LandingPageContent.tsx`

**Step 1: Copy file content**

Copy the exact content from source to target.

---

### Task 1.3: Copy All Welcome Section Components

**Files:**
- Create: `resources/js/components/Welcome/AboutSection.tsx`
- Create: `resources/js/components/Welcome/CtaSection.tsx`
- Create: `resources/js/components/Welcome/DemoSection.tsx`
- Create: `resources/js/components/Welcome/FaqSection.tsx`
- Create: `resources/js/components/Welcome/FeaturesSection.tsx`
- Create: `resources/js/components/Welcome/FooterSection.tsx`
- Create: `resources/js/components/Welcome/HeroSection.tsx`
- Create: `resources/js/components/Welcome/HowItWorksSection.tsx`
- Create: `resources/js/components/Welcome/NavBar.tsx`
- Create: `resources/js/components/Welcome/ProgressTimeline.tsx`
- Create: `resources/js/components/Welcome/StatsSection.tsx`
- Create: `resources/js/components/Welcome/UseCasesSection.tsx`

**Source files:**
- `C:\Code\Kolabri\Kolabri\client-app\resources\js\components\Welcome\{Component}.tsx`

**Step 1: Copy all section component files**

Copy each file from source to target maintaining exact content.

---

### Task 1.4: Copy Helpers.tsx

**Files:**
- Create: `resources/js/components/Welcome/utils/helpers.tsx`
- Source: `C:\Code\Kolabri\Kolabri\client-app\resources\js\components\Welcome\utils\helpers.tsx`

**Step 1: Copy helpers file**

Copy the exact content - this contains UI primitives (LiquidGlassCard, PrimaryButton, SecondaryButton, etc.)

---

## Phase 2: Copy UI Components

### Task 2.1: Copy PasswordInput Component

**Files:**
- Create: `resources/js/components/ui/PasswordInput.tsx`
- Source: `C:\Code\Kolabri\Kolabri\client-app\resources\js\components\ui\PasswordInput.tsx`

**Step 1: Copy file**

---

### Task 2.2: Copy PasswordStrengthMeter Component

**Files:**
- Create: `resources/js/components/ui/PasswordStrengthMeter.tsx`
- Source: `C:\Code\Kolabri\Kolabri\client-app\resources\js\components\ui\PasswordStrengthMeter.tsx`

**Step 1: Copy file**

---

### Task 2.3: Copy CustomCheckbox Component

**Files:**
- Create: `resources/js/components/ui/CustomCheckbox.tsx`
- Source: `C:\Code\Kolabri\Kolabri\client-app\resources\js\components\ui\CustomCheckbox.tsx`

**Step 1: Copy file**

---

### Task 2.4: Update InputError Component

**Files:**
- Modify: `resources/js/components/ui/input-error.tsx`
- Source: `C:\Code\Kolabri\Kolabri\client-app\resources\js\components\ui\input-error.tsx`

**Step 1: Update file**

Replace existing content with source content (uses `text-warning-500` class).

---

### Task 2.5: Copy ToastNotification Component

**Files:**
- Create: `resources/js/components/ui/ToastNotification.tsx`
- Source: `C:\Code\Kolabri\Kolabri\client-app\resources\js\components\ui\ToastNotification.tsx`

**Step 1: Copy file**

---

## Phase 3: Update Layouts

### Task 3.1: Update Guest Layout

**Files:**
- Modify: `resources/js/layouts/guest-layout.tsx`
- Source: `C:\Code\Kolabri\Kolabri\client-app\resources\js\layouts\guest-layout.tsx`

**Step 1: Backup existing file**

**Step 2: Replace with source content**

This adds:
- Theme context provider
- Dark/light mode toggle
- Glass morphism background with OrganicBlob
- Branding section with logo
- Toast notifications

---

## Phase 4: Update Pages

### Task 4.1: Update Welcome Page

**Files:**
- Modify: `resources/js/pages/welcome.tsx`
- Source: `C:\Code\Kolabri\Kolabri\client-app\resources\js\pages\welcome.tsx`

**Step 1: Replace content**

Replace default Laravel welcome with full landing page including:
- SEO meta tags
- Plus Jakarta Sans font
- LandingPageContent component
- Theme state management

---

### Task 4.2: Update Login Page

**Files:**
- Modify: `resources/js/pages/auth/login.tsx`
- Source: `C:\Code\Kolabri\Kolabri\client-app\resources\js\pages\auth\login.tsx`

**Step 1: Replace content**

Update to use:
- GuestLayout with theme
- LiquidGlassCard wrapper
- Custom PasswordInput component
- Custom CustomCheckbox component
- PrimaryButton component
- Glass morphism styling

---

### Task 4.3: Update Register Page

**Files:**
- Modify: `resources/js/pages/auth/register.tsx`
- Source: `C:\Code\Kolabri\Kolabri\client-app\resources\js\pages\auth\register.tsx`

**Step 1: Replace content**

Update to use:
- GuestLayout with theme
- LiquidGlassCard wrapper
- Custom PasswordInput component
- PasswordStrengthMeter component
- Role selection radio buttons
- Glass morphism styling

---

## Phase 5: Verification

### Task 5.1: Run TypeScript Check

**Step 1: Check for type errors**

Run: `npx tsc --noEmit`

**Step 2: Fix any type errors**

---

### Task 5.2: Run Build

**Step 1: Build the application**

Run: `npm run build` or `npx vite build`

**Step 2: Verify build succeeds**

---

### Task 5.3: Test Pages

**Step 1: Start dev server**

Run: `php artisan serve` and `npm run dev`

**Step 2: Verify pages load**
- Welcome page at `/`
- Login page at `/login`
- Register page at `/register`

**Step 3: Test functionality**
- Theme toggle works
- Forms submit correctly
- Animations play
- Responsive design works
