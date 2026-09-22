# CrimeConnect Premium Safety Platform

## Overview
Build CrimeConnect as a polished, responsive community-safety platform with a public informational website, secure account access, three role-specific workspaces, private incident reporting, and a privacy-preserving incident map.

## Stage 1 — Brand, Homepage, and Public Pages
- Establish the dark navy, royal blue, white, emergency red, and verified green design system with clean modern typography.
- Build the CrimeConnect shield-and-pin identity, responsive navigation, hero illustration, floating safety cards, feature grid, four-step workflow, clearly labeled demo metrics, emergency notice, and polished footer.
- Add dedicated How It Works, About, Privacy Policy, Terms of Use, and Emergency Help pages with unique page titles and descriptions.
- Apply restrained entrance, counter, card, and page transitions with reduced-motion support.

## Stage 2 — Secure Accounts and Role Access
- Enable email/password and Google sign-in through Lovable Cloud.
- Build split-screen sign-in, user registration, forgot-password, and password-reset experiences.
- Store full profiles, institution membership, and roles separately; new registrations receive only the standard user role.
- Prevent self-selection of Security Officer or Principal access. Privileged roles require an existing administrator-approved role assignment.
- Route authenticated people to the correct workspace and provide reliable sign-out behavior.

## Stage 3 — Role-Based Workspaces
- Build a shared responsive workspace shell with desktop sidebar and compact mobile navigation.
- User workspace: summary, report shortcut, status counts, recent reports, and tracking timeline.
- Security Officer workspace: command-center summary, review queue, incident table, filters, details, evidence review, notes, and status updates limited to authorized areas.
- Principal workspace: institution-only safety overview, locations, reports, pending reviews, awareness summary, and authorized review controls.
- Include demo presentation data where no account data exists, always labeled as demo.

## Stage 4 — Reporting, Evidence, and Location
- Build a four-step validated incident form covering details, private evidence upload, browser GPS/manual correction, and final review.
- Restrict uploads by type and size, keep the evidence bucket private, and show privacy guidance throughout.
- Generate a readable report ID after submission and expose reports only to the reporter and authorized reviewers.
- Add clear allegation and emergency-service disclaimers.

## Stage 5 — Safety Map and Quality Pass
- Add an interactive Leaflet/OpenStreetMap safety map with clustering, search, filters, zoom controls, map legend, and authorized detail panel.
- Reduce location precision for public/demo presentation while retaining authorized exact coordinates.
- Add loading skeletons, empty/error states, notifications, accessible controls, and toast feedback.
- Verify desktop, tablet, and mobile layouts; run access-policy and database security checks.

## Technical Details
- Use TanStack Start routes and shared layouts with semantic design tokens in Tailwind CSS.
- Use Lovable Cloud for authentication, profiles, institutions, incidents, evidence metadata, review history, notifications, and private storage.
- Apply row-level policies, separate role records, server-side input validation, audit timestamps, and institution/area authorization checks.
- Use Leaflet with OpenStreetMap tiles and marker clustering; load the map client-side to preserve server rendering.
- Seed only clearly labeled fictional demonstration incidents and locations.
