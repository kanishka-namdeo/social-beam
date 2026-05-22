# Flow 1.1 — Authentication & Onboarding

**Priority**: P0
**Last Updated**: 2026-05-21
**Screenshot Count**: 5 screenshots

## Overview
Documents the login, account creation, and initial onboarding flows for Buffer. Covers email-based authentication, social login options, and the post-login welcome experience including the channel connection checklist.

## Entry Point
- **URL**: `https://buffer.com/login` or `https://buffer.com/register`
- **Prerequisite**: None — entry point for all new and returning users

## User Journey

| Step | Action | Expected Result | Screenshot |
|------|--------|-----------------|------------|
| 1 | User navigates to `buffer.com` and clicks "Sign In" or "Get Started Free" | Redirected to login/register page with email form | `01-login-page.png` |
| 2 | User enters email (`kanishkanamdeo@hotmail.com`) and password | Email validated, password field visible | `02-email-entry.png` |
| 3 | User submits credentials or selects social login (Google) | Authentication processed, 2FA prompt if enabled | `03-authentication.png` |
| 4 | User successfully authenticated | Redirected to dashboard home page | `04-dashboard-redirect.png` |
| 5 | First-time user completes welcome checklist | Progress saved, guided tour optionally shown | `05-welcome-checklist.png` |

### Social Login Sub-Flow

| Step | Action | Expected Result | Screenshot |
|------|--------|-----------------|------------|
| 1 | User clicks "Continue with Google" | Google OAuth consent screen opens | `06-google-oauth.png` |
| 2 | User grants permission | Redirected back to Buffer with OAuth token | `07-oauth-callback.png` |
| 3 | Account created or authenticated | User lands on dashboard or onboarding | `08-post-oauth-landing.png` |

## Key States

### Empty State
**When**: User has no connected social channels
**Behavior**: Welcome checklist prominently displayed with "Connect your first channel" as first item. CTA button directs to Settings > Connected Accounts.

### Error State
**When**: Invalid credentials or expired session
**Behavior**: Inline error message displayed below relevant field. "Forgot password?" link available. Rate limiting applied after 5 failed attempts.

### Loading State
**When**: Authentication in progress
**Behavior**: Submit button transitions to spinner. Page-level skeleton loader shown during redirect.

## Navigation
- **Access**: Direct URL, homepage CTA, or email link from Buffer notifications
- **Related Flows**:
  - Flow 7.1 — Settings & Account Management (channel connection post-login)
  - Flow 2.1 — Dashboard Home (post-login landing)

## Welcome Checklist (Post-Login)

| Item | Status | Description |
|------|--------|-------------|
| Connect first channel | Complete | User connected Instagram, Threads, and Bluesky (1/3 initially, LinkedIn error) |
| Create first post | Complete | Post creation flow completed |
| Schedule first post | Complete | Post queued or scheduled |
| View analytics | Incomplete | Analytics page not yet visited |

**Progress**: 3 of 4 items complete

## Account Context

- **Account Email**: `kanishkanamdeo@hotmail.com`
- **Organization**: "My Organization"
- **Time Zone**: Dubai (UTC+4)
- **View Streak**: 5 days
