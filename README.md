# Community Safety Hub

CrimeConnect – Premium Smart Crime Reporting Website

Build a highly professional, modern, and visually impressive crime reporting and community safety website named CrimeConnect.

This website is a college Community Engagement Project (CEP) developed by CSE students. The design should look like a real-world security technology platform, with a polished interface, responsive layout, interactive dashboards, and functional demo features.

BRANDING

Website Name: CrimeConnect

Tagline: "Report. Track. Protect."

Theme: Smart Safety + Community Protection

Color Palette:

- Navy Blue (#0B1F3A)

- Royal Blue (#2563EB)

- White

- Light Gray

- Red accent for emergency alerts

- Green for verified/resolved statuses

Use a clean, professional, premium UI with subtle animations, rounded cards, modern typography, and consistent spacing.

Avoid graphic crime imagery. Use professional shield, map pin, security, and community icons.

1. PREMIUM HOMEPAGE

Create a stunning landing page with:

Navbar

- CrimeConnect logo with shield + location pin icon.

- Home

- Features

- How It Works

- Safety Map

- About

- Login button

- Get Started button

Hero Section

Main heading:

"Together, We Build a Safer Community."

Subheading:

"Report incidents, share locations, and connect communities with a smarter safety monitoring platform."

Buttons:

- Report an Incident

- Explore Features

Hero Visual:

- Modern 3D-style shield or security illustration.

- Floating GPS location card.

- Floating "Secure Reporting" card.

- Floating incident status card.

- Subtle background map pattern.

Features Section

Create 4 premium feature cards:

1. Secure Crime Reporting

2. GPS Location Mapping

3. Role-Based Access

4. Incident Monitoring

How It Works

Show 4 steps in a horizontal timeline:

1. Login Securely

2. Report an Incident

3. Add Photo and Location

4. Authorized Review

Statistics Section

Use clearly labeled demo statistics:

- Reports Submitted (Demo)

- Locations Mapped (Demo)

- Reports Under Review (Demo)

- Resolved Reports (Demo)

Do not present mock numbers as real crime statistics.

2. ADVANCED LOGIN PAGE

Create a premium split-screen login page.

Left side:

- CrimeConnect logo.

- Security illustration.

- Text: "Your Community. Your Safety."

- Short description.

Right side:

- Login card.

- Email input.

- Password input.

- Show/hide password button.

- Role selection cards:

  - User

  - Security Officer

  - Principal

- Login button.

- Forgot Password.

- Create Account for users.

- Back to Home.

After login, redirect users to their respective dashboards.

Implement authentication using Supabase Auth or another suitable backend.

Do not allow users to select a privileged role without administrator approval. Security Officer and Principal accounts must be authorized.

3. USER DASHBOARD

Create a modern dashboard with a sidebar.

Sidebar:

- Dashboard

- Report Incident

- My Reports

- Safety Map

- Notifications

- Profile

- Logout

Main dashboard:

- Welcome card.

- "Report an Incident" primary button.

- Total Submitted Reports.

- Reports Under Review.

- Resolved Reports.

- Recent Reports table.

- Report tracking timeline.

Use status badges:

- Submitted

- Under Review

- Referred to Authorities

- Resolved

4. REPORT INCIDENT PAGE

Create a visually clear, multi-step incident reporting form.

Step 1: Incident Information

- Incident Type

- Date and Time

- Description

- Landmark / Address

Step 2: Upload Evidence

- Upload photo.

- Image preview.

- File validation.

- Privacy notice.

Step 3: GPS Location

- Use Current Location button.

- Ask for browser location permission.

- Display latitude and longitude.

- Interactive map marker.

- Allow manual correction.

Step 4: Review and Submit

- Display a summary of entered details.

- Confirmation checkbox.

- Submit Report button.

Show a generated report ID after successful submission.

Do not expose reports publicly by default. Add a clear privacy notice and avoid collecting unnecessary personal information.

5. SECURITY OFFICER DASHBOARD

Design a professional command-center dashboard.

Sidebar:

- Overview

- All Incidents

- Incident Map

- Review Queue

- Reports

- Settings

Dashboard cards:

- Total Reports

- Pending Reviews

- Active Review Cases

- Resolved Reports

Main content:

- Large interactive incident map.

- Recent incident table.

- Filter by incident type, date, status, and authorized area.

- Search by report ID.

- View incident details.

- Review uploaded photos.

- Add review notes.

- Update status.

Create a clean map interface with location pins, a legend, and a details panel.

6. PRINCIPAL DASHBOARD

Create a separate, professional institution safety dashboard.

Features:

- Institution-related reports.

- Safety incident overview.

- Map of authorized locations.

- Recent incident reports.

- Pending review information.

- Safety awareness summary.

- Authorized report review.

Use institution-based access restrictions. Principals should not automatically access reports from unrelated institutions.

7. LIVE GPS SAFETY MAP

Create an interactive map page using Leaflet and OpenStreetMap or another supported provider.

Features:

- Incident markers.

- Marker clustering.

- Map zoom controls.

- Location search.

- Filter by incident type.

- Filter by report status.

- Details panel for authorized users.

Use privacy-preserving location display where appropriate. Avoid revealing precise sensitive locations to unauthorized users.

Use mock incident locations if the map service or backend is not configured.

Do not implement secret tracking or continuous background location monitoring.

8. DATABASE AND SECURITY

Use Supabase for:

- Authentication.

- Role management.

- Database.

- Photo storage.

- Incident locations.

- Review history.

Database tables:

- profiles

- institutions

- incidents

- incident_photos

- incident_reviews

- notifications

Security:

- Row Level Security.

- Proper role authorization.

- Private file storage.

- Secure authentication.

- Input validation.

- Upload restrictions.

- Audit timestamps.

- No hardcoded secrets.

Use a review workflow and do not label allegations as proven crimes without appropriate verification.

9. PREMIUM UI ANIMATIONS

Add subtle animations:

- Smooth page transitions.

- Fade-in hero content.

- Hover effects on feature cards.

- Animated dashboard counters for demo values.

- Smooth map marker interactions.

- Loading skeletons.

- Toast notifications.

Keep animations professional and accessible.

10. RESPONSIVE DESIGN

The website must work perfectly on:

- ASUS laptop / desktop.

- Mobile phone.

- Tablet.

Use responsive navigation, readable tables, touch-friendly controls, and mobile-friendly forms.

11. ABOUT AND SAFETY PAGES

Create:

- About CrimeConnect.

- How It Works.

- Privacy Policy.

- Terms of Use.

- Emergency Help section.

Emergency notice:

"This platform is not an emergency response service. If you are in immediate danger, contact local emergency services."

12. FINAL QUALITY REQUIREMENTS

Build a polished, fully navigable website with:

- Working login and authentication.

- Role-based dashboards.

- Functional report form.

- Secure photo upload.

- GPS permission and map integration.

- Database integration.

- Responsive UI.

- Demo data for presentation.

- Proper loading and error states.

Prioritize a visually impressive homepage, a premium login experience, and a clean dashboard that looks suitable for a second-year CSE college CEP presentation.

Build the website in stages, starting with the homepage, login, dashboards, and then the reporting and map functionality.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://www-crimeconnect-in.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/69977a3a-32e1-4e4d-a451-3641e9706b46).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
