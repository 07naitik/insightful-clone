# Insightful Time Tracking Clone

A complete, Insightful-compatible time-tracking solution with backend API, Electron desktop client, and web onboarding portal.

## 🏗️ Architecture Overview

This is a monorepo containing three main components:

- **Backend**: FastAPI-based REST API with Supabase PostgreSQL and JWT authentication
- **Desktop App**: Electron + React desktop client for time tracking with screenshot capture
- **Web Onboarding**: React-based web portal for employee activation

## 📁 Project Structure

```
insightful-clone/
├── backend/                 # FastAPI backend API
│   ├── app/
│   │   ├── api/v1/         # API endpoints
│   │   ├── core/           # Configuration, database, auth
│   │   ├── models/         # SQLAlchemy models
│   │   └── schemas/        # Pydantic schemas
│   ├── alembic/            # Database migrations
│   ├── tests/              # Unit tests
│   ├── Dockerfile
│   └── requirements.txt
├── desktop-app/            # Electron + React desktop client
│   ├── src/                # React frontend
│   ├── electron-main/      # Electron main process
│   ├── public/
│   └── package.json
├── web-onboarding/         # React web onboarding app
│   ├── src/
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── README.md
```

## 🚀 Quick Start (Docker)

### Prerequisites

- Docker and Docker Compose
- Supabase account and project
- Node.js 18+ (for desktop app development)

### 1. Environment Setup

Create a `.env` file in the root directory:

```env
# Supabase Configuration
SUPABASE_DB_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
SUPABASE_SERVICE_KEY=your_supabase_service_key
SUPABASE_PROJECT_URL=https://[project-ref].supabase.co

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_ALGORITHM=HS256

# API Configuration
API_V1_PREFIX=/api/v1
```

### 2. Supabase Setup

#### Database Schema

Run these SQL commands in your Supabase SQL editor:

```sql
-- Create employees table
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    is_activated BOOLEAN DEFAULT false NOT NULL,
    activation_token VARCHAR(255) UNIQUE,
    jwt_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ
);

-- Create projects table
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ
);

-- Create tasks table
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ
);

-- Create time_entries table
CREATE TABLE time_entries (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    ip_address VARCHAR(45),
    mac_address VARCHAR(17),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ
);

-- Create screenshots table
CREATE TABLE screenshots (
    id SERIAL PRIMARY KEY,
    time_entry_id INTEGER NOT NULL REFERENCES time_entries(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    captured_at TIMESTAMPTZ NOT NULL,
    permission_flag BOOLEAN DEFAULT true NOT NULL,
    ip_address VARCHAR(45),
    mac_address VARCHAR(17),
    file_size INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_activation_token ON employees(activation_token);
CREATE INDEX idx_time_entries_employee_id ON time_entries(employee_id);
CREATE INDEX idx_time_entries_task_id ON time_entries(task_id);
CREATE INDEX idx_screenshots_time_entry_id ON screenshots(time_entry_id);
CREATE INDEX idx_screenshots_employee_id ON screenshots(employee_id);
```

#### Storage Bucket

1. Go to Supabase Dashboard → Storage
2. Create a new bucket named `screenshots`
3. Set the bucket to public (or configure appropriate policies)

### 3. Start the Backend

```bash
# Start the backend API with Docker
docker-compose up -d

# Or run locally with Python
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

- API Documentation: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`

## 🖥️ Desktop Application

### Development Setup

```bash
cd desktop-app
npm install
npm run dev
```

### Building the Installer

```bash
cd desktop-app
npm run dist
```

This will generate a Windows installer at `desktop-app/dist/installer.exe`

### Features

- **Secure Authentication**: JWT token stored in OS keychain
- **Project/Task Selection**: Browse and select assigned work
- **Time Tracking**: Start/stop timer with live duration display
- **Screenshot Capture**: Automated screenshots every 5 minutes (configurable)
- **Network Information**: Captures IP and MAC address
- **Offline Support**: Queues actions when offline, syncs when reconnected
- **System Integration**: Native OS notifications and system tray

## 🌐 Web Onboarding Application

### Development

```bash
cd web-onboarding
npm install
npm run dev
```

### Building for Production

```bash
cd web-onboarding
npm run build
```

### Deployment

The web onboarding app is deployable as static files to any hosting provider (Netlify, Vercel, S3, etc.) or using the provided Docker container.

#### Docker Deployment

```bash
cd web-onboarding
docker build -t insightful-onboarding .
docker run -p 80:80 insightful-onboarding
```

### Features

- **Employee Activation**: `/activate/:token` route for account activation
- **Download Portal**: Direct links to desktop app releases
- **Responsive Design**: Works on desktop and mobile devices
- **Error Handling**: Comprehensive error states and user guidance

## 📡 API Documentation

### Authentication

All API endpoints (except activation) require JWT bearer token authentication:

```bash
Authorization: Bearer <jwt_token>
```

### Core Endpoints

#### Authentication
- `POST /api/v1/auth/token` - Login and get JWT token
- `POST /api/v1/auth/logout` - Logout and invalidate token

#### Employees
- `GET /api/v1/employees` - List employees
- `POST /api/v1/employees` - Create employee
- `GET /api/v1/employees/{id}` - Get employee details
- `PATCH /api/v1/employees/{id}` - Update employee
- `DELETE /api/v1/employees/{id}` - Delete employee
- `POST /api/v1/employees/activate` - Activate employee account

#### Projects
- `GET /api/v1/projects` - List projects
- `POST /api/v1/projects` - Create project
- `GET /api/v1/projects/{id}` - Get project details
- `PATCH /api/v1/projects/{id}` - Update project
- `DELETE /api/v1/projects/{id}` - Delete project

#### Tasks
- `GET /api/v1/tasks` - List tasks (optionally filter by project)
- `POST /api/v1/tasks` - Create task
- `GET /api/v1/tasks/{id}` - Get task details
- `PATCH /api/v1/tasks/{id}` - Update task
- `DELETE /api/v1/tasks/{id}` - Delete task

#### Time Entries
- `GET /api/v1/time_entries` - List time entries
- `POST /api/v1/time_entries` - Create time entry (clock in)
- `GET /api/v1/time_entries/{id}` - Get time entry details
- `PATCH /api/v1/time_entries/{id}` - Update time entry (clock out)
- `POST /api/v1/time_entries/{id}/stop` - Stop time entry
- `DELETE /api/v1/time_entries/{id}` - Delete time entry

#### Screenshots
- `GET /api/v1/screenshots` - List screenshots
- `POST /api/v1/screenshots` - Upload screenshot (multipart)
- `GET /api/v1/screenshots/{id}` - Get screenshot details
- `DELETE /api/v1/screenshots/{id}` - Delete screenshot

### Sample API Calls

#### Create Employee

```bash
curl -X POST "http://localhost:8000/api/v1/employees" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "is_active": true
  }'
```

#### Start Time Tracking

```bash
curl -X POST "http://localhost:8000/api/v1/time_entries" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "task_id": 1,
    "ip_address": "192.168.1.100",
    "mac_address": "00:11:22:33:44:55"
  }'
```

#### Upload Screenshot

```bash
curl -X POST "http://localhost:8000/api/v1/screenshots" \
  -H "Authorization: Bearer <token>" \
  -F "image=@screenshot.png" \
  -F "employee_id=1" \
  -F "time_entry_id=1" \
  -F "permission=true" \
  -F "ip=192.168.1.100" \
  -F "mac=00:11:22:33:44:55"
```

## 🧪 Testing

### Backend Tests

```bash
cd backend
pytest tests/ -v
```

### Running All Tests

```bash
cd backend
pytest tests/ -v --cov=app --cov-report=html
```

## 🔧 Development

### Pre-commit Hooks

Install pre-commit hooks for code quality:

```bash
pip install pre-commit
pre-commit install
```

### Code Formatting

The backend uses Black, isort, and flake8 for code formatting and linting:

```bash
cd backend
black app/ tests/
isort app/ tests/
flake8 app/ tests/
```

## 🚀 Production Deployment

### Backend

1. Set production environment variables
2. Run database migrations: `alembic upgrade head`
3. Deploy using Docker or your preferred method
4. Set up reverse proxy (nginx) for HTTPS
5. Configure monitoring and logging

### Desktop App

1. Build the installer: `npm run dist`
2. Sign the executable for Windows
3. Distribute via your preferred method (email, download portal, etc.)
4. Consider using auto-updater for seamless updates

### Web Onboarding

1. Build the static files: `npm run build`
2. Deploy to static hosting (Netlify, Vercel, S3 + CloudFront)
3. Configure environment variables for API endpoints
4. Set up custom domain and HTTPS

## 📋 TODO / Roadmap

- [ ] Email integration for activation links
- [ ] Auto-updater for desktop app
- [ ] macOS and Linux support
- [ ] Advanced screenshot analysis
- [ ] Productivity metrics and reporting
- [ ] Team management features
- [ ] Mobile companion app
- [ ] Integration with popular project management tools

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes and add tests
4. Run the test suite: `npm test` / `pytest`
5. Commit your changes: `git commit -am 'Add new feature'`
6. Push to the branch: `git push origin feature/new-feature`
7. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:

1. Check the documentation above
2. Review the API documentation at `/docs`
3. Check the issues section on GitHub
4. Contact the development team

## 🔒 Security

This application handles sensitive employee data and screenshots. Ensure proper security measures:

- Use HTTPS in production
- Regularly update dependencies
- Implement proper access controls
- Monitor for security vulnerabilities
- Follow data protection regulations (GDPR, etc.)

---

**Built with ❤️ for modern time tracking and employee monitoring.**
