PM POSHAN PRO V2

A modern, offline first Mid Day Meal management system built for schools.
Designed for accuracy, speed, and real world usage in low connectivity environments.

Live App
https://imransir09.github.io/PM-POSHAN-PRO-V2/


---

Overview

PM POSHAN PRO V2 helps schools manage daily meal records, stock, receipts, and reports with precision.
It works offline using local storage and supports optional cloud backup using Supabase.

Built with a clean UI, structured data flow, and practical workflows aligned with actual school operations.


---

Key Features

Daily Meal Entry

Record daily meal consumption

Track rice usage and cooking cost

Auto calculations for totals


Receipts Management

Log incoming rice and cash

Category wise tracking
Balvatika
Primary
Middle


Dashboard

Monthly overview

Real time summaries

Clean and readable analytics


Reports

Generate structured reports

Ready for printing and submission

Accurate monthly aggregation


Offline First System

Works with internet

Data stored in browser localStorage

Fast and reliable in rural environments


Cloud Backup and Restore

Backup full app data to Supabase

Restore anytime using UDISE code

One record per school


Data Import and Export

Export full data as JSON

Import and validate backup files

Safe overwrite with confirmation


Settings Control

School details and UDISE

Enrollment and rates

Core configuration panel



---

Tech Stack

React + TypeScript

LocalStorage for offline persistence

Supabase for cloud sync

Tailwind / Custom UI components

Modular component architecture



---

Data Architecture

The app uses a structured data model:

settings

daily entries

receipts

cashbook

metadata


All stored locally and optionally synced to Supabase using UDISE as unique identifier.


---

Cloud Sync Design

Each school is identified by UDISE

Backup stored in backups table

One row per school

Uses upsert to avoid duplicates



---

Installation

git clone https://github.com/ImranSir09/PM-POSHAN-PRO-V2.git
cd PM-POSHAN-PRO-V2
npm install
npm run dev


---

Supabase Setup

Create a table:

Table name: backups

Columns:

udise (text, primary key)

data (jsonb)

created_at (timestamp)


Enable Row Level Security and add policies:

Allow SELECT
Allow INSERT
Allow UPDATE

Using condition:

true


---

Usage Flow

1. Enter school details and UDISE


2. Add daily meal entries


3. Record receipts


4. View dashboard and reports


5. Backup data to cloud


6. Restore anytime if needed




---

Strengths of the Project

Works fully offline

Clean and intuitive UI

Real use case driven design

Reliable backup system

Scalable architecture



---

Limitations

No authentication system yet

Single user per device model

Cloud sync is manual, not auto



---

Future Improvements

Multi user login

Real time sync

Mobile app version

Advanced analytics

Role based access



---

Developer

Imran Gani Mugloo
Government Middle School Senzi
Anantnag, Jammu and Kashmir

Contact
+91 9149690096
emraanmugloo123@gmail.com


---

License

This project is open source and available for educational and institutional use.
