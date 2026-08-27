# University Student Portal

> A modern, responsive university student portal built with React, Vite, Tailwind CSS, and Firebase.

## 🌐 Live Demo

**https://university-portal-demo.web.app**

## 📋 Overview

University Student Portal is a role-based web application designed to provide students and university staff with a centralized platform for managing academic activities and university services.

The application provides different capabilities based on the authenticated user's role, while maintaining a shared and responsive interface across desktop and mobile devices.

This project was developed as a portfolio/academic project with an emphasis on:

* Clean and maintainable React architecture
* Responsive and RTL-friendly UI
* Firebase Authentication and Firestore
* Role-based authorization
* Firestore security rules
* Practical academic workflows
* Light and dark theme support

## ✨ Features

### 🎓 Student

* Dashboard
* Course browsing and registration
* Course dropping
* Credit-limit validation
* Weekly schedule
* Facility reservations
* Reservation cancellation
* Announcements
* Academic and administrative requests
* Support tickets
* Profile management
* Password reset
* Help & FAQ
* Light / Dark mode
* Responsive mobile interface

### 🛠️ Admin & Staff

* Role-based dashboard
* Course management
* Announcement management
* Reservation management
* Request management
* Support management
* User management
* Administrative statistics
* Shared responsive interface with role-aware navigation

## 🔐 Security

The application uses Firebase Authentication together with Firestore Security Rules to enforce access control.

Key security measures include:

* Firebase Authentication
* Role-based access control
* Protected application routes
* Firestore Security Rules
* Student data isolation
* Ownership validation for student records
* Protection of restricted academic fields
* Role-escalation protection
* Transaction-based operations for critical workflows
* Client-side validation combined with server-side Firestore authorization

> **Important:** Firebase client configuration is loaded through environment variables. Actual `.env` files are intentionally excluded from version control.

## 🛠️ Tech Stack

### Frontend

* React
* JavaScript
* Vite
* Tailwind CSS
* React Router
* React Hook Form
* React Icons
* Context API

### Backend / Services

* Firebase Authentication
* Cloud Firestore
* Firebase Hosting

### Testing & Tooling

* Playwright
* ESLint
* Vite production build

## 🎨 UI & UX

* Responsive design
* RTL layout
* Persian localization
* Vazirmatn typography
* Light / Dark mode
* Accessible semantic controls
* Keyboard-friendly interactions
* Responsive navigation
* Mobile-specific interaction patterns
* Consistent empty, loading, error, and confirmation states

## 📁 Project Structure

```text
university-student-portal/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   └── ui/
│   ├── config/
│   ├── context/
│   ├── data/
│   ├── firebase/
│   ├── layout/
│   ├── pages/
│   ├── routes/
│   ├── services/
│   └── utils/
├── tests/
├── .env.example
├── .firebaserc
├── firebase.json
├── firestore.rules
├── index.html
├── package.json
├── playwright.config.js
├── vite.config.js
└── README.md
```

## 🚀 Getting Started

### Requirements

Make sure the following are installed:

* Node.js
* npm
* A Firebase project

### 1. Clone the repository

```bash
git clone https://github.com/MohammadGhorbani-dev/university-student-portal.git
cd university-student-portal
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure Firebase

Create a local `.env` file in the project root based on `.env.example`:

```bash
cp .env.example .env
```

On Windows, you can simply copy `.env.example` and rename the copy to:

```text
.env
```

Then add your own Firebase project configuration.

The required variables are documented in `.env.example`.

> The `.env` file is intentionally ignored by Git and must never be committed.

### 4. Start the development server

```bash
npm run dev
```

Then open the local URL shown by Vite, typically:

```text
http://localhost:5173
```

## 🧪 Testing

Run the project's available checks with:

```bash
npm run lint
```

For the production build:

```bash
npm run build
```

The production output is generated in:

```text
dist/
```

## 🌍 Firebase Hosting Deployment

The project is configured for Firebase Hosting.

After configuring the appropriate Firebase CLI authentication and project:

```bash
npm run build
firebase deploy --only hosting
```

The Firebase Hosting configuration uses the Vite `dist/` directory and includes the SPA rewrite required for React Router routes.

## 🔧 Environment Variables

The repository contains `.env.example` as a safe template.

Actual environment files are intentionally excluded from Git:

```text
.env
.env.*
```

except for:

```text
.env.example
```

Anyone running the project locally must create their own `.env` file and provide configuration for their own Firebase project.

This does **not** provide access to the original Firebase project or its private data.

## 📌 Notes

This repository is intended as a portfolio/academic demonstration project.

The live demo uses a dedicated Firebase project. Local developers should use their own Firebase project and environment configuration when running the application independently.

No production credentials, private keys, or real student records are included in the repository.

## 📄 License

This project is provided for educational and portfolio purposes.
