# ⚡ SmartEventa AI — Intelligent Event Management & Discovery System

> **SmartEventa AI** is a modern, full-stack, AI-powered event discovery and management web application built for university project demonstration.

---

## 🌟 Key Innovation

The core feature of **SmartEventa AI** is **Automated Webpage Extraction with AI**:
- Administrators paste any public event webpage URL.
- SmartEventa automatically fetches the page via `axios`, parses Open Graph, Twitter Cards, JSON-LD, and HTML metadata via `cheerio`.
- If key fields (such as date, location, category, description) are missing or unformatted, **Google Gemini AI** (`@google/generative-ai`) analyzes the page text to extract structured data.
- The administrator previews and edits the automatically generated draft, then approves and creates the event in MongoDB.
- Approved events appear dynamically on the public Events page with real-time status calculation (**Upcoming**, **Ongoing**, **Past**).

---

## 🏗️ Technology Stack

### **Frontend**
- **HTML5**: Semantic tags, accessible forms, responsive layout structures
- **CSS3**: Vanilla CSS with custom properties (CSS variables), dark glassmorphism design, smooth micro-animations, mobile responsive media queries
- **JavaScript (ES6+)**: Centralized API config, Fetch API, local storage auth session management

### **Backend**
- **Node.js & Express.js**: RESTful API architecture, CORS, middleware, global error handling
- **MongoDB & Mongoose**: Schemas with validation, pre-save password hashing, virtual fields for dynamic event status
- **JWT & bcryptjs**: Secure password hashing and token-based authentication with role-based access control (User vs. Admin)
- **Axios & Cheerio**: Webpage scraping, Open Graph / JSON-LD parsing, relative URL resolution
- **Google GenAI SDK (`@google/generative-ai`)**: Gemini AI integration for missing event metadata extraction

---

## 📂 Project Architecture & Folder Structure

```
SmartEventa-AI-Website/
├── backend/
│   ├── config/
│   │   └── db.js               # MongoDB connection config
│   ├── controllers/
│   │   ├── ai.js               # AI extraction controller (Axios + Cheerio + Gemini)
│   │   ├── auth.js             # Authentication controller (signup, login, me)
│   │   └── events.js           # Event CRUD, search, filter & participation
│   ├── middleware/
│   │   └── auth.js             # JWT protect and adminOnly authorization guards
│   ├── models/
│   │   ├── Event.js            # Event Mongoose schema with dynamic status virtual
│   │   └── User.js             # User Mongoose schema with bcrypt hashing
│   ├── routes/
│   │   ├── ai.js               # Admin-only AI extraction routes
│   │   ├── auth.js             # Auth routes
│   │   └── events.js           # Event public & protected routes
│   ├── utils/
│   │   ├── dateParser.js       # Flexible multi-format date parsing utility
│   │   ├── extractor.js        # Cheerio HTML & metadata extraction pipeline
│   │   └── urlResolver.js      # Absolute URL resolution for relative images/links
│   ├── seed.js                 # Sample database seeder (Creates Admin + User + 6 Events)
│   ├── server.js               # Express server entry point
│   ├── test-api.js             # Automated 21-point API test suite
│   ├── package.json
│   ├── .env                    # Local environment variables
│   └── .env.example            # Template environment file
│
└── frontend/
    ├── config.js               # Centralized API configuration & Auth session utility
    ├── index.html / index.css / index.js           # Public Landing Page
    ├── events.html / events.css / events.js         # Events Discovery & Filter Page
    ├── event-details.html / .css / .js             # Event Details & Registration Page
    ├── login.html / signup.html / auth.css / .js   # Auth Pages
    └── admin.html / admin.css / admin.js           # Admin AI Dashboard & Management
```

---

## 🔑 Environment Variables (`backend/.env`)

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/smarteventa
JWT_SECRET=smarteventa_super_secret_jwt_key_change_in_production_2024
GEMINI_API_KEY=your_gemini_api_key_here
```

---

## 🚀 How to Run the Project

### 1️⃣ Prerequisites
- **Node.js** (v18 or higher)
- **MongoDB** running locally on port `27017` (or a MongoDB Atlas URI in `.env`)

### 2️⃣ Start the Backend Server
```bash
cd backend
npm install
npm run seed     # Seeds sample Admin, User, and 6 realistic events
npm start        # Starts Express server on http://localhost:5000
```

### 3️⃣ Run API Test Suite (Optional)
```bash
cd backend
node test-api.js
```
*(Runs 21 automated end-to-end assertions covering Auth, RBAC, Extraction, Events, and Registration)*

### 4️⃣ Open the Frontend
Open `frontend/index.html` directly in your browser, or serve it using Live Server / any HTTP server:
```bash
# Option A: Open directly in browser
c:\Users\Admin\Desktop\SmartEventa-AI-Website\frontend\index.html

# Option B: Using npx serve or Live Server
npx serve frontend
```

---

## 👤 Demo Login Credentials

| Role | Email | Password | Access |
|---|---|---|---|
| **Admin** | `admin@smarteventa.com` | `Admin@1234` | Full access to Admin AI Dashboard (`admin.html`) |
| **User** | `user@smarteventa.com` | `User@1234` | Public browsing, search, filtering, and event registration |

---

## 🤖 Admin AI Extraction Workflow

1. Log in as Admin (`admin@smarteventa.com` / `Admin@1234`).
2. Navigate to **Dashboard** (`admin.html`).
3. Paste any public event webpage URL (e.g. `https://allevents.in/vadodara/kids-relay-race-20-tickets/80002489450554`).
4. Click **Extract Event with AI**.
5. SmartEventa fetches the HTML, parses Open Graph tags & JSON-LD, uses Gemini AI for missing metadata, and presents an editable draft with a real-time card preview.
6. Make any edits if needed, then click **Approve & Create Event**.
7. The event is immediately saved to MongoDB and published to the public **Events** page.

---

## 📡 API Endpoints Summary

### **Authentication**
- `POST /api/auth/signup` — Register new user
- `POST /api/auth/login` — Authenticate user & receive JWT token
- `GET /api/auth/me` — Get current user profile `(Protected)`

### **Events**
- `GET /api/events` — Retrieve events `(Supports ?search=, ?category=, ?status=)`
- `GET /api/events/:id` — Retrieve single event by ID
- `POST /api/events/create` — Create event `(Admin only)`
- `GET /api/events/admin/my` — Get admin created events `(Admin only)`
- `POST /api/events/:id/participate` — Register user for an event `(Protected)`
- `DELETE /api/events/:id` — Delete event `(Admin only)`

### **AI Extraction**
- `POST /api/ai/extract` — Extract structured event data from webpage URL `(Admin only)`

---

## 📊 Dynamic Event Status Calculation

SmartEventa dynamically calculates event status on the backend using Mongoose virtual fields — **no manual admin status updates required**:
- **Upcoming**: Event date is in the future.
- **Live Now (Ongoing)**: Event date is today.
- **Past**: Event date has passed.

---

## 🎓 University Viva Presentation Checklist

- [x] Full-stack architecture with Node.js/Express backend & Vanilla JS frontend
- [x] Complete RESTful API design with clean JSON responses & HTTP status codes
- [x] Robust JWT authentication & server-enforced role-based access control (RBAC)
- [x] Intelligent web scraping (Axios + Cheerio) with Google Gemini AI structured fallback
- [x] MongoDB database layer with Mongoose models, validation, and virtual fields
- [x] Graceful fallbacks for website blocks or missing metadata
- [x] Responsive CSS design with glassmorphic dark theme and micro-animations
- [x] 100% Passing end-to-end automated test suite (`backend/test-api.js`)


## Recent user features

- **Favorites:** Logged-in users can save/remove events and view them from `favorites.html`.
- **Reviews & ratings:** Event Details includes a one-review-per-user rating/review system with edit and delete support.
- **SmartEventa branding:** The supplied SmartEventa logo is used in the site branding and favicon.
- **Admin dashboard:** Added a more polished visual treatment while preserving existing AI extraction/event-management behavior.

### Development URLs

- Frontend: `http://127.0.0.1:3000` (or `http://localhost:3000`)
- Backend API: `http://localhost:5000/api`

Keep the backend and frontend running in separate terminals during development.
