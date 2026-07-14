# Project Overview — Tonir Restaurant Reservation System

## What We're Building
A full-stack restaurant reservation platform with two interfaces:
1. **Tonir** — React Native mobile app for customers
2. **Tonir-admin** — Next.js web app for restaurant staff and admins
3. **Supabase** — backend (database, auth, storage, edge functions)

## Core Features

### Customer App (tonir)
- View restaurant info (hours, location, description)
- Browse available time slots by date and party size
- Make a reservation (name, phone, email, party size, date/time, notes)
- Receive email confirmation
- Cancel reservation via app or confirmation link
- View upcoming and past reservations

### Admin Panel (tonir-admin)
- Dashboard: today's reservations at a glance
- Reservation list: view, search, filter, edit, cancel
- Table management: add/edit tables and capacity
- Schedule management: set opening hours per day
- Block specific dates (holidays, private events)
- Guest history: search guests by name/email/phone
- Analytics: covers per day, no-show rate, peak hours

## Business Rules
- Reservation slots: 90 minutes per booking (configurable)
- One table per reservation — no table combining
- Minimum 2 hours advance notice to book
- Cancellations allowed up to 1 hour before reservation time
- Max party size: 20 (configurable)
- Email reminder sent 24 hours before reservation
- Auto-assign smallest available table that fits party size

## User Roles (Supabase Auth)
- **Guest** — unauthenticated or authenticated customer
- **Staff** — authenticated admin panel user, can manage reservations
- **Admin** — full access including settings, tables, schedule

## Out of Scope (v1)
- Online payments or deposits
- Waitlist management
- Multiple restaurant locations
- POS integration
- Push notifications (add in v2)
- SMS reminders (add in v2)
