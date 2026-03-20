# Kolabri Client App

Frontend application for Kolabri - AI-Powered Collaborative Learning Platform. Built with Laravel 12, React 19, TypeScript, and Tailwind CSS.

## 🎯 Purpose

Kolabri is an educational platform designed for **Socially Shared Regulated Learning (SSRL)**. It enables:
- **Students**: Collaborative group learning with AI-powered guidance
- **Lecturers**: Monitor student progress, set learning goals, manage knowledge bases
- **AI Assistant**: Context-aware responses using RAG (Retrieval-Augmented Generation)
- **Analytics**: Process mining and engagement analytics for research

## 🛠️ Tech Stack

- **Backend Framework**: Laravel 12 (PHP 8.3+)
- **Frontend Framework**: React 19 + TypeScript
- **State Management**: Inertia.js (server-side state)
- **Styling**: Tailwind CSS
- **Build Tool**: Vite (HMR-enabled)
- **Database**: PostgreSQL (Eloquent ORM)
- **Real-time**: Socket.IO Client
- **Package Manager**: Composer (PHP), npm (JavaScript)

## 📋 Prerequisites

- PHP 8.3+
- Composer 2.6+
- Node.js 20.x
- npm 10.x
- PostgreSQL 14+
- Git

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd client-app

# Install PHP dependencies
composer install

# Install JavaScript dependencies
npm install
```

### 2. Environment Configuration

```bash
# Copy environment file
cp .env.example .env

# Generate APP_KEY
php artisan key:generate

# Update .env with your settings
```

**Key .env variables:**

```env
APP_NAME=Kolabri
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8000

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=kolabri-db
DB_USERNAME=postgres
DB_PASSWORD=your_password

VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

### 3. Database Setup

⚠️ **CRITICAL: Database Sharing with Core-API**

This project shares the PostgreSQL database with **Kolabri Core API** (Node.js/Prisma). The `users` table and all business logic tables are managed by Core-API, not Laravel.

**Migration Order (MUST FOLLOW):**

```bash
# Step 1: Run Core-API migrations FIRST (creates users, courses, etc.)
cd ../Kolabri-core-api
npx prisma migrate deploy

# Step 2: Then run Laravel migrations (creates sessions, cache, jobs only)
cd ../Kolabri-client-app
php artisan migrate
```

**⚠️ DO NOT use `php artisan migrate:fresh`** - it will drop ALL tables including Core-API tables!

If you need to reset Laravel tables only:
```bash
php artisan migrate:rollback  # Rolls back Laravel migrations only
php artisan migrate            # Re-runs Laravel migrations
```

### 4. Start Development Server

**Terminal 1 - Laravel Backend:**
```bash
php artisan serve
# Runs on http://localhost:8000
```

**Terminal 2 - Vite Frontend:**
```bash
npm run dev
# HMR runs on http://localhost:5173
```

**Terminal 3 - Socket.IO (from Core-API):**
```bash
# Ensure core-api is running on :3000
cd ../core-api && npm run dev
```

Access the app at `http://localhost:8000`

## 📁 Project Structure

```
client-app/
├── app/
│   ├── Http/
│   │   ├── Controllers/           # Request handlers (courses, auth, etc.)
│   │   ├── Middleware/            # Auth, CORS, etc.
│   │   └── Requests/              # Form validation rules
│   ├── Models/                    # Eloquent models (User, Course, Group, etc.)
│   └── Providers/                 # Service providers
├── bootstrap/
│   └── app.php                    # Framework initialization
├── config/
│   ├── app.php                    # Core config
│   ├── auth.php                   # Auth drivers
│   ├── database.php               # Database config
│   ├── filesystems.php            # Storage config
│   ├── inertia.php                # Inertia.js config
│   └── session.php                # Session config
├── database/
│   ├── factories/                 # Model factories
│   ├── migrations/                # Database schema
│   └── seeders/                   # Database seeders
├── public/
│   ├── index.php                  # Entry point
│   └── build/                     # Compiled assets (Vite output)
├── resources/
│   ├── css/
│   │   └── app.css                # Global Tailwind styles
│   ├── js/
│   │   ├── app.ts                 # React app setup
│   │   ├── Pages/                 # Inertia page components
│   │   │   ├── Auth/
│   │   │   ├── Dashboard/
│   │   │   ├── Lecturer/
│   │   │   └── Student/
│   │   ├── components/            # Reusable React components
│   │   ├── layouts/               # Layout wrappers
│   │   ├── types/                 # TypeScript interfaces
│   │   └── utils/                 # Helper functions
│   └── views/
│       └── app.blade.php          # Root Blade template
├── routes/
│   ├── web.php                    # Web routes (Inertia)
│   └── console.php                # Console commands
├── storage/
│   ├── app/                       # File uploads
│   ├── framework/                 # Framework files
│   └── logs/                      # Application logs
├── tests/
│   ├── Feature/                   # Feature tests
│   └── Unit/                      # Unit tests
├── docker/
│   └── nginx/
│       └── default.conf           # Nginx config for Docker
├── vite.config.ts                 # Vite configuration
├── tsconfig.json                  # TypeScript configuration
├── composer.json                  # PHP dependencies
├── package.json                   # Node.js dependencies
├── phpunit.xml                    # PHPUnit configuration
└── Dockerfile                     # Docker build file

```

## 🔐 Authentication Flow

```
┌──────────────┐
│  Login Page  │
└──────┬───────┘
       │ POST /api/login
       ▼
┌──────────────────────┐
│ Laravel Controller   │ → Validate credentials
│ (AuthController)     │ → Generate JWT
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│   Store JWT in      │
│ Session (Inertia)   │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  Redirect to        │
│  Dashboard          │
└──────────────────────┘
```

## 🎓 User Roles & Features

### Student
- View enrolled courses
- Create/join study groups
- Set learning goals
- Submit reflections
- Chat with AI and group members
- View engagement analytics

### Lecturer
- Create courses (with join codes)
- Manage enrolled students
- Create study groups
- Upload knowledge base (PDFs)
- Monitor group progress
- View learning analytics

## 📊 Key Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | Dashboard | Landing / role-based redirect |
| `/login` | Auth/Login | User authentication |
| `/register` | Auth/Register | User registration |
| `/courses` | Courses/Index | My courses list |
| `/courses/{id}` | Courses/Show | Course details & knowledge base |
| `/courses/{id}/groups/{groupId}` | Groups/Show | Group chat & collaboration |
| `/goals` | Goals/Index | My learning goals |
| `/analytics` | Analytics/Dashboard | Engagement dashboard |

## 🔄 Real-time Features

The client communicates with **Core-API** via Socket.IO for real-time updates:

```typescript
// Example: Join chat room
socket.emit('join_room', { courseId, groupId });

// Listen for new messages
socket.on('receive_message', (message) => {
  // Update UI
});

// Send message to @AI
socket.emit('send_message', {
  content: 'Hey @AI, what is...?'
});
```

## 📤 Knowledge Base Upload

Students and lecturers can upload PDFs to the knowledge base:

1. **File Selection**: Choose PDF files (max 10MB)
2. **Processing**: 
   - Sent to Core-API `/api/courses/:id/knowledge-base`
   - Forwarded to AI-Engine `/api/ingest/batch`
   - Text extraction + optional OCR
3. **Status Tracking**:
   - `pending`: Processing
   - `ready`: Available for RAG queries
   - `failed`: Upload error
4. **Display**: Only `ready` files shown to users

## 🌐 Environment Variables

```env
# App Config
APP_NAME=Kolabri
APP_ENV=local|production
APP_KEY=base64:...
APP_URL=http://localhost:8000
APP_DEBUG=true|false

# Database
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=kolabri-db
DB_USERNAME=postgres
DB_PASSWORD=your_password

# Frontend API Integration
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000

# Optional: MongoDB for chat logs
MONGODB_URI=mongodb://localhost:27017/kolabri

# Mail (optional)
MAIL_DRIVER=log
```

## 🏗️ Building & Deployment

### Development Build
```bash
npm run dev
# Vite dev server with hot reload
```

### Production Build
```bash
npm run build
# Compiles assets to public/build/
php artisan migrate --force
php artisan config:cache
php artisan route:cache
```

### Docker Deployment

Build and run in Docker:
```bash
docker build -t kolabri-client .
docker run -p 8080:80 -e APP_KEY=base64:... kolabri-client
```

Or use docker-compose (recommended):
```bash
docker-compose up -d client-app-php client-app-web
```

## 🗄️ Database Architecture

### Shared Database Setup

This application uses a **shared PostgreSQL database** with Kolabri Core-API:

| Component | Managed By | Tables |
|-----------|-----------|--------|
| **Core-API (Prisma)** | Node.js/Express | `users`, `courses`, `groups`, `chat_spaces`, `chat_messages`, `learning_goals`, `reflections`, `knowledge_bases`, `ai_chats` |
| **Client-App (Laravel)** | PHP/Laravel | `sessions`, `cache`, `jobs`, `password_reset_tokens` |

### Table Ownership

**Core-API Tables (Read-Only from Laravel):**
- `users` - User accounts with UUID, role enum, google_id
- `courses` - Course management
- `groups` - Study groups
- All business logic tables

**Laravel Tables:**
- `sessions` - Session storage
- `cache` - Application cache
- `jobs` - Queue jobs
- `password_reset_tokens` - Password reset functionality

### Migration Strategy

1. **Core-API migrations run first** - Creates all business tables
2. **Laravel migrations run second** - Creates infrastructure tables only
3. **Laravel skips `users` table** - Already exists from Core-API

See [Database Setup](#3-database-setup) for commands.

## 📝 Database Schema

### Core Tables
- `users` - User accounts with roles
- `courses` - Courses created by lecturers
- `groups` - Study groups within courses
- `knowledge_bases` - Uploaded PDF files
- `learning_goals` - Student goals
- `reflections` - Student reflections
- `chat_messages` - Chat history (also in MongoDB)

## 🔗 Integration Points

### Core-API (Backend)
- Authentication: `/api/login`, `/api/register`
- Courses: `/api/courses`, `/api/courses/{id}`
- Knowledge Base: `/api/courses/{id}/knowledge-base`
- Real-time chat: Socket.IO on `:3000`

### AI-Engine
- Document upload: `/api/ingest/batch`
- RAG queries: `/api/query`
- Interventions: `/api/intervention/*`

## 📚 Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `php artisan serve` | Start Laravel dev server |
| `php artisan migrate` | Run database migrations |
| `php artisan db:seed` | Seed demo data |
| `php artisan tinker` | Interactive shell |
| `php artisan storage:link` | Create storage symlink |

## 🧪 Testing

```bash
# Run PHPUnit tests
php artisan test

# Run specific test
php artisan test tests/Feature/CourseTest.php

# With coverage
php artisan test --coverage
```

## 🐛 Troubleshooting

### Database Issues

#### Error: "table public.users does not exist"
**Cause:** Laravel migrations ran before Core-API migrations, or `migrate:fresh` dropped Core-API tables.

**Fix:**
```bash
# 1. Reset database and apply Core-API migrations first
cd ../Kolabri-core-api
npx prisma db execute --file prisma/reset_for_prisma.sql
npx prisma migrate deploy

# 2. Then run Laravel migrations
cd ../Kolabri-client-app
php artisan migrate
```

#### Error: "relation 'users' already exists" (Duplicate table)
**Cause:** Both Laravel and Core-API trying to create users table.

**Fix:** 
- Laravel migration has been modified to skip users table creation
- Just run: `php artisan migrate` (not `migrate:fresh`)

#### Database Connection Error
```bash
# Check PostgreSQL is running
# Verify DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD in .env

# Test connection
php artisan tinker
>>> DB::connection()->getPdo();
```

### Port Already in Use
```bash
# Laravel on different port
php artisan serve --port=8001

# Vite on different port
npm run dev -- --port 5174
```

### CORS Issues
- Ensure `VITE_API_URL` matches Core-API URL
- Check Core-API CORS configuration

### Asset Not Found (404)
```bash
# Rebuild assets
npm run build

# Or in development:
npm run dev
```

## 📖 Additional Resources

- [Laravel Documentation](https://laravel.com/docs)
- [React 19 Guide](https://react.dev/reference/react)
- [Inertia.js Documentation](https://inertiajs.com)
- [Tailwind CSS](https://tailwindcss.com/docs)

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -m "Add feature"`
3. Push to branch: `git push origin feature/your-feature`
4. Open a Pull Request

## 📄 License

MIT License - Kolabri Project

## 👥 Support

For issues and feature requests, please open an issue in the main Kolabri repository.
