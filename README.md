# Cookie Lab

## The Ultimate Client-Side Cookie Inspector, Security Auditor & Multi-Format Exporter

[![GitHub Stars](https://img.shields.io/github/stars/zigzag-007/Cookie-Lab?style=for-the-badge&logo=github&color=yellow)](https://github.com/zigzag-007/Cookie-Lab/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)
[![No Uploads](https://img.shields.io/badge/Privacy-100%25%20Local-success?style=for-the-badge)](https://github.com/zigzag-007/Cookie-Lab)
[![Zero Telemetry](https://img.shields.io/badge/Telemetry-Zero-blue?style=for-the-badge)](https://github.com/zigzag-007/Cookie-Lab)
[![Tailwind CSS v4](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)

**Paste. Inspect. Audit. Export. All in your browser with zero network requests.**

---

## ✨ What is Cookie Lab?

Cookie Lab is a **privacy-first, client-side developer utility** designed to analyze browser cookie tables copied directly from DevTools (Chrome, Edge, Brave, Firefox, Safari). It normalizes raw tab-separated table rows, computes security ratings, identifies potential vulnerabilities, groups cookies by domain scope, and provides one-click export into Netscape, JSON, or standard HTTP request headers.

Everything executes locally in your browser memory. Your cookies never leave your device.

---

## 🎯 Who Is It For?

| 🛡️ Security Engineers | 🌐 Web Developers | 🧪 QA & Testers | 🔍 Privacy Enthusiasts |
| :---: | :---: | :---: | :---: |
| Audit flags & SameSite policies | Debug session lifetimes & scopes | Verify auth tokens & expiration | Inspect tracker scopes locally |

---

## 💡 Key Features

### 📋 Instant DevTools Table Ingestion
- Direct paste support for Chrome, Edge, Brave, Firefox, and Safari DevTools cookie tables
- Robust parser forgiving of whitespace variations, missing headers, and custom column layouts
- Error detection with inline diagnostics for malformed rows

### 🔒 Client-Side Security Auditing
- Automated flag detection: **Secure**, **HttpOnly**, and **SameSite** (Strict / Lax / None)
- Vulnerability highlighting: warns on unencrypted transit, JavaScript access, or missing CSRF protections
- Real-time lifetime calculation distinguishing session cookies from persistent storage

### 📊 Interactive Visual Insights
- **At a glance** metric cards (Total, Live, Session, Expired, Domains, Selected)
- **Paged carousels** with responsive 1-tile and 2-tile layouts, keyboard navigation, and touch swipe gestures
- Granular table inventory with multi-criteria filtering and instant column sorting

### 💾 Flexible Multi-Format Export
- **Netscape HTTP Cookie format** (`cookies.txt`) compatible with `curl`, `wget`, yt-dlp, and automation scripts
- **JSON export** capturing parsed attributes and security metadata
- **HTTP Header string** (`Cookie: name=value; name=value`) ready for Postman, curl, or fetch requests
- One-click download or direct clipboard copy with immediate visual feedback

### 🎨 Premium Interface
- Deep navy dark theme and crisp light theme with smooth animated toggle
- Kinetic background grid and ambient aurora effects
- Fully responsive layout tailored for wide desktop, tablet, and mobile screens

---

## 🚀 Quick Start

### Running Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/zigzag-007/Cookie-Lab.git
   cd Cookie-Lab
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start a local server:
   ```bash
   npx serve .
   ```

4. Run unit tests:
   ```bash
   npm test
   ```

---

## 📦 Export Formats

| Format | Primary Use Case | Output Structure |
| :--- | :--- | :--- |
| **Netscape** | `curl -b`, `wget`, command line utilities | Tab-separated 7 columns with domain flags & UNIX timestamps |
| **JSON** | API workflows, backups, documentation | Normalized JSON array with security profiles & remaining lifetimes |
| **Header string** | Direct request headers, Postman, fetch | Standard `name=value; name=value` request header |

---

## 📁 Project Structure

```
Cookie-Lab/
├── assets/                     # Fonts, brand icons, and SVG graphics
│   ├── icon.svg
│   ├── inter-latin.woff2
│   ├── jetbrains-mono-latin.woff2
│   └── plus-jakarta-sans-latin.woff2
├── css/                        # Tailwind CSS v4 styling
│   ├── input.css
│   └── styles.css
├── js/                         # Modular client-side application logic
│   ├── app.js                  # Main controller, state, and UI bindings
│   ├── cookie-analyzer.js      # Audit rules, scope detection, and lifetimes
│   ├── cookie-exporter.js      # Netscape, JSON, and Header string serializers
│   ├── cookie-parser.js        # Tab-separated DevTools table row parser
│   ├── cursor-glow.js          # Interactive cursor spotlight effect
│   ├── kinetic-grid.js         # Animated canvas ambient grid
│   └── theme-toggle.js         # LocalStorage dark/light theme manager
├── tests/                      # Node.js native test runner test suite
│   ├── cookie-analyzer.test.js
│   ├── cookie-exporter.test.js
│   └── cookie-parser.test.js
├── index.html                  # Accessible single-page web app entry point
├── LICENSE                     # MIT License
├── package.json                # Project scripts and Tailwind dependencies
└── README.md                   # Project documentation
```

---

## 📄 License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for details.

---

Crafted with ❤️ by **[Zig Zag](https://github.com/zigzag-007)**
