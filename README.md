# OppositeLab 🚀

OppositeLab is a modern, real-time cross-platform collaboration platform designed to bridge web and mobile workflows. It enables teams to collaborate efficiently through shared workspaces, real-time updates, and integrated video conferencing.

**Now available on:** 🌐 Web (PWA) | 🍎 iOS App Store | 🤖 Google Play Store

## 🛠️ Tech Stack

### **Frontend & Mobile**
* **Web:** [Next.js](https://nextjs.org/) (React) / Tailwind CSS for responsive UI
* **Mobile:** [Capacitor](https://capacitorjs.com/) for iOS & Android native apps
* **PWA:** Progressive Web App with offline support and installability

### **Backend & Database**
* **API/Server:** Next.js API Routes / Node.js
* **Database:** [MongoDB Atlas](https://www.mongodb.com/atlas/database) (Cloud NoSQL DB) with Mongoose / Native Driver
* **Real-Time Communication (RTC):** [LiveKit](https://livekit.io/) for high-performance video calls and audio streams
* **Email Services:** Resend API for transactional emails and notifications

---

## ✨ Key Features

* **Cross-Platform Synchronization:** Seamless experience across desktop web browsers and mobile devices.
* **Progressive Web App (PWA):** Install on any device with offline support and native-like experience.
* **Native Mobile Apps:** Full iOS and Android apps built from the same codebase.
* **Real-Time Video Conferencing:** Integrated WebRTC video calling powered by LiveKit with secure token authentication.
* **Workspace & Activity Tracking:** Dynamic user management, role-based workflows, and live notifications.
* **Cloud-First Architecture:** Production-ready database integration hosted securely on MongoDB Atlas.

---

## 📱 PWA + Mobile Apps

OppositeLab uses a single codebase to deploy across all platforms:

- **Web PWA**: Installable progressive web app with offline support
- **iOS App**: Native app for iPhone and iPad (App Store)
- **Android App**: Native app for Android devices (Play Store)

### Quick Start for Mobile Development

```bash
# Install Capacitor dependencies
.\setup-capacitor.ps1

# Initialize mobile platforms
npm run cap:init
npm run cap:add:ios
npm run cap:add:android

# Build and open in native IDEs
npm run mobile:ios      # Opens Xcode
npm run mobile:android  # Opens Android Studio
```

**📚 Full Documentation:**
- **[PWA & Capacitor Guide](PWA_CAPACITOR_GUIDE.md)** - Complete setup and deployment guide
- **[Quick Start](QUICK_START.md)** - Fast reference for commands
- **[Architecture](ARCHITECTURE.md)** - System design and data flow
- **[Setup Summary](SETUP_SUMMARY.md)** - What's been configured

---

## ⚙️ Getting Started Locally

### 1. Clone the Repository
```bash
git clone [https://github.com/your-username/oppositelab.git](https://github.com/your-username/oppositelab.git)
cd oppositelab