# InfoCampus - University Management ERP System

![Django](https://img.shields.io/badge/Django-6.0.1-092E20?style=for-the-badge&logo=django&logoColor=white)
![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=JSON%20web%20tokens&logoColor=white)

> A comprehensive ERP system for university management with Role-Based Access Control (RBAC), financial module with intelligent debt management, and academic tracking capabilities.

**Developed by:** Arin Romero  
**Role:** Prompt Architect | Product Owner | Project Director  
**Date:** February 2026

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Installation & Setup](#-installation--setup)
- [Functional Modules](#-functional-modules)
- [RBAC System](#-rbac-system-role-based-access-control)
- [Business Logic](#-business-logic)
- [Data Population Scripts](#-data-population-scripts)
- [API Documentation](#-api-documentation)
- [Project Metrics](#-project-metrics)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

**InfoCampus** is a full-stack ERP (Enterprise Resource Planning) system designed for comprehensive university management. It implements a robust **Role-Based Access Control (RBAC)** system with five differentiated operational roles.

### Project Goals

This project was developed as a **professional portfolio piece** to demonstrate:
- Full-stack development capabilities
- Complex business logic implementation
- Scalable architecture design
- Technical project management skills

### Key Achievements

- ✅ Complete ERP system with 5 operational modules
- ✅ Sophisticated financial logic with automatic debt calculation
- ✅ Real-world data simulation (20% delinquency, 20% failures, 20% scholarships)
- ✅ Comprehensive audit trail system
- ✅ RESTful API with JWT authentication
- ✅ Responsive modern UI with role-specific dashboards

---

## ✨ Key Features

### Core Functionality

- ✅ **Complete RBAC system** with 5 operational roles
- ✅ **JWT authentication** with access and refresh tokens
- ✅ **Fully documented RESTful API**
- ✅ **Intelligent financial blocking** based on payment delinquency
- ✅ **Complete audit trail** for grade modifications
- ✅ **Role-specific analytical dashboards**
- ✅ **Scholarship system** with automatic discount calculation
- ✅ **Responsive design** adaptable to all devices
- ✅ **Automated realistic data population**

### Demo Credentials

After running the population scripts, you can access with:

```
Default password: InfoCampus2026
```

Specific credentials are generated in `credenciales/*.txt` after running `3_poblacion.py`

---

## 🏗️ System Architecture

```
infocampus/
├── backend/                    # Django REST API
│   ├── api/                   # Django apps
│   │   ├── carreras/         # Career management
│   │   ├── materias/         # Course management
│   │   ├── usuarios/         # User system
│   │   ├── secciones/        # Sections and schedules
│   │   ├── inscripciones/    # Enrollment registration
│   │   ├── calificaciones/   # Grading system
│   │   └── pagos/            # Financial module
│   ├── manage.py
│   └── requirements.txt
│
├── frontend/                   # React + Vite
│   ├── src/
│   │   ├── components/       # Reusable components
│   │   ├── pages/           # Role-specific views
│   │   ├── services/        # API calls
│   │   ├── context/         # Context API
│   │   └── utils/           # Utilities
│   ├── package.json
│   └── vite.config.js
│
├── scripts/                    # Population scripts
│   ├── 1_malla.py            # Academic structure
│   ├── 2_secciones.py        # Periods and sections
│   ├── 3_poblacion.py        # Users and roles
│   └── 4_actividad.py        # Academic activity
│
└── credenciales/              # Auto-generated
    └── *.txt                  # User credentials
```

### Architecture Diagram

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Frontend  │ ◄─────► │   Backend    │ ◄─────► │   SQLite    │
│ React + Vite│  HTTP   │ Django + DRF │  ORM    │   Database  │
└─────────────┘         └──────────────┘         └─────────────┘
      │                        │
      │                        │
      ▼                        ▼
  Tailwind CSS          JWT Authentication
  React Router          Django Middleware
  Axios Client          CORS Headers
```

---

## 🛠️ Tech Stack

### Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Django** | 6.0.1 | Main web framework |
| **Django REST Framework** | 3.16.1 | RESTful API construction |
| **djangorestframework-simplejwt** | 5.5.1 | JWT authentication |
| **django-cors-headers** | 4.9.0 | CORS handling |
| **Faker** | 40.1.2 | Test data generation |
| **Pillow** | 12.1.0 | Image processing |
| **python-dotenv** | 1.2.1 | Environment variables |

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 19.2.0 | UI library |
| **Vite** | 7.2.4 | Build tool and dev server |
| **Tailwind CSS** | 4.1.18 | Styling framework |
| **Axios** | 1.13.2 | HTTP client |
| **React Router** | 7.13.0 | SPA routing |
| **Recharts** | 3.7.0 | Charts and visualization |
| **Lucide React** | 0.563.0 | Icon library |
| **Framer Motion** | 12.29.2 | Animations |

### Development Tools

- **Git** - Version control
- **ESLint** - JavaScript linting
- **PostCSS** - CSS processing
- **SQLite Browser** - Database exploration

---

## 🚀 Installation & Setup

### Prerequisites

```bash
# Required versions
Python 3.11+
Node.js 18+
npm 9+
```

### Step-by-Step Installation

#### 1️⃣ Clone the Repository

```bash
git clone https://github.com/your-username/infocampus.git
cd infocampus
```

#### 2️⃣ Backend Setup (Terminal 1)

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Linux/Mac:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure database
python manage.py makemigrations
python manage.py migrate

# Run population scripts (IN ORDER)
python 1_malla.py
python 2_secciones.py
python 3_poblacion.py
python 4_actividad.py

# Start development server
python manage.py runserver
```

**Backend available at:** `http://localhost:8000`

#### 3️⃣ Frontend Setup (Terminal 2)

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

**Frontend available at:** `http://localhost:5173`

### ⚙️ Environment Variables

Create `.env` file in backend root:

```env
# Django
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DATABASE_NAME=db.sqlite3

# JWT
JWT_ACCESS_TOKEN_LIFETIME=60
JWT_REFRESH_TOKEN_LIFETIME=1440
```

---

## 📦 Functional Modules

### 1. Curriculum Management
- ✅ Career administration
- ✅ Course and credit management
- ✅ Prerequisites system
- ✅ Credit pricing configuration

### 2. Periods and Sections System
- ✅ Academic cycle control
- ✅ Schedule and classroom management
- ✅ Professor assignment
- ✅ Enrollment capacity control

### 3. Enrollment System
- ✅ Student registration in sections
- ✅ Available capacity validation
- ✅ Prerequisites verification
- ✅ Enrollment history

### 4. Grade Management
- ✅ Grade entry by professors
- ✅ Grade queries
- ✅ Change audit trail
- ✅ Automatic average calculation

### 5. Financial Module
- ✅ Automatic debt calculation
- ✅ Scholarship system (25%, 50%, 75%, 100%)
- ✅ Delinquency blocking
- ✅ Payment registration
- ✅ Financial reports

### 6. Analytical Dashboard
- ✅ Role-specific key indicators
- ✅ Interactive charts
- ✅ Quick access shortcuts
- ✅ Real-time statistics

---

## 🔐 RBAC System (Role-Based Access Control)

### Implemented Roles

| Role | Permissions | Use Cases |
|-----|----------|--------------|
| 👨‍🎓 **Student** | - View enrolled courses<br>- Check grades<br>- View financial status<br>- Download certificates | Limited access to personal information |
| 👨‍🏫 **Professor** | - Enter grades<br>- Modify grades<br>- View student lists<br>- Generate section reports | Academic management of their sections |
| 💰 **Treasurer** | - Register payments<br>- Generate financial reports<br>- Manage delinquency<br>- Configure scholarships | Complete financial control |
| 📊 **Coordinator** | - Manage sections<br>- Assign professors<br>- View academic reports<br>- Manage schedules | Academic coordination |
| 👔 **Director** | - Complete system access<br>- Configure careers<br>- Manage periods<br>- View all reports | General administration |

### Permission Implementation

```python
# Example of permission decorator
from functools import wraps
from rest_framework.response import Response
from rest_framework import status

def role_required(allowed_roles):
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if request.user.role not in allowed_roles:
                return Response(
                    {"error": "You don't have permission for this action"},
                    status=status.HTTP_403_FORBIDDEN
                )
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator

# Usage in views
@role_required(['professor', 'coordinator', 'director'])
def enter_grade(request):
    # Grade entry logic
    pass
```

---

## 💼 Business Logic

### Intelligent Financial System

#### Debt Calculation

```python
def calculate_student_debt(student):
    """
    Calculates total student debt considering:
    - Unpaid enrollments
    - Applicable scholarships
    - Grace days per career
    """
    total_debt = 0
    
    for enrollment in student.enrollments.filter(paid=False):
        course_cost = enrollment.section.course.credits * \
                     enrollment.section.course.career.credit_price
        
        # Apply scholarship discount
        if student.scholarship_percentage > 0:
            discount = course_cost * (student.scholarship_percentage / 100)
            course_cost -= discount
        
        total_debt += course_cost
    
    return total_debt
```

#### Delinquency Blocking

```python
def verify_delinquency_block(student):
    """
    Verifies if a student should be blocked for delinquency
    """
    debt = calculate_student_debt(student)
    grace_days = student.career.grace_days
    
    # Check for overdue debt
    for enrollment in student.enrollments.filter(paid=False):
        deadline = enrollment.enrollment_date + timedelta(days=grace_days)
        
        if datetime.now() > deadline and debt > 0:
            return True  # Blocked
    
    return False  # Not blocked
```

### Scholarship System

Calculation formula:

```
Final Cost = Credits × Price per Credit × (1 - Scholarship Percentage / 100)
```

**Example:**
- Course: 4 credits
- Price per credit: $50
- Scholarship: 50%
- Final cost: 4 × $50 × (1 - 0.5) = **$100**

### Operational Realism Simulation

The system generates data reflecting real-world complexity:

| Metric | Value | Purpose |
|---------|-------|---------|
| Delinquent Students | **20%** | Validate financial blocks |
| Failed Grades | **20%** | Test academic restrictions |
| Scholarship Students | **20%** | Validate discount calculations |

---

## 📊 Data Population Scripts

### Script 1: `1_malla.py` - Academic Structure

**Purpose:** Create the institution's complete curriculum.

```python
# Example output
"""
✓ Created 5 careers
✓ Created 30 courses (6 per career)
✓ Assigned credits: 2-5 per course
✓ Configured prices: $45-$80 per credit
"""
```

**Generated careers:**
- Computer Engineering
- Law
- Medicine
- Business Administration
- Psychology

### Script 2: `2_secciones.py` - Time Logistics

**Purpose:** Configure academic periods and generate operational sections.

```python
# Example output
"""
✓ Created 4 academic periods
✓ Generated ~60 sections
✓ Assigned schedules: 7:00 AM - 8:00 PM
✓ Distributed classrooms: A101-A120
"""
```

**Created periods:**
- 2024-2 (Closed)
- 2025-1 (Closed)
- 2025-2 (Closed)
- 2026-1 (Active)

### Script 3: `3_poblacion.py` - User Population

**Purpose:** Create complete user structure and roles (RBAC).

```python
# Example output
"""
✓ Created 150 students
✓ Created 20 professors
✓ Created 2 directors
✓ Created 3 coordinators
✓ Created 3 treasurers
✓ Generated credentials in 'credenciales/' folder
"""
```

**Features:**
- Realistic personal data with Faker
- Automatic professor assignment to sections
- Student-career linking
- Individual `.txt` credential files generation

### Script 4: `4_actividad.py` - Academic Activity

**Purpose:** Simulate historical and current academic and financial activity.

```python
# Example output
"""
✓ Generated ~900 current enrollments
✓ Generated ~1,200 historical enrollments
✓ Recorded ~600 payment transactions
✓ Implemented 20% failures
✓ Implemented 20% delinquency
"""
```

---

## 🌐 API Documentation

### Authentication

```http
POST /api/auth/login/
Content-Type: application/json

{
  "username": "student123",
  "password": "InfoCampus2026"
}

Response:
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": 1,
    "username": "student123",
    "role": "student",
    "name": "John Doe"
  }
}
```

### Career Management

```http
# List all careers
GET /api/careers/

# Get specific career
GET /api/careers/{id}/

# Create new career (Director only)
POST /api/careers/
Authorization: Bearer {access_token}

# Update career (Director only)
PUT /api/careers/{id}/
Authorization: Bearer {access_token}
```

### Enrollment Management

```http
# Enroll in a section
POST /api/enrollments/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "section_id": 15,
  "student_id": 45
}

Response:
{
  "id": 123,
  "student": "John Doe",
  "section": "Mathematics I - Section A",
  "enrollment_date": "2026-02-03T10:30:00Z",
  "paid": false,
  "cost": 200.00
}
```

### Grade Management

```http
# Enter grade (Professor only)
POST /api/grades/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "enrollment_id": 123,
  "grade": 8.5,
  "period": "2026-1"
}

# Query grades (Student)
GET /api/grades/student/{id}/
Authorization: Bearer {access_token}

Response:
{
  "student": "John Doe",
  "period": "2026-1",
  "grades": [
    {
      "course": "Mathematics I",
      "grade": 8.5,
      "credits": 4,
      "status": "Passed"
    },
    ...
  ],
  "period_average": 8.2
}
```

### Financial Module

```http
# Register payment (Treasurer only)
POST /api/payments/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "student_id": 45,
  "amount": 200.00,
  "payment_method": "cash",
  "concept": "Mathematics I Enrollment"
}

# Query financial status (Student)
GET /api/payments/status/{student_id}/
Authorization: Bearer {access_token}

Response:
{
  "student": "John Doe",
  "total_debt": 600.00,
  "current_period_debt": 400.00,
  "previous_periods_debt": 200.00,
  "blocked": true,
  "has_payment_plan": false,
  "scholarship_percentage": 50
}
```

---

## 📈 Project Metrics

### Generated Data Volume

| Entity | Quantity |
|---------|----------|
| Careers | 5 |
| Courses | 30 |
| Academic Periods | 4 |
| Sections | ~60 |
| Total Users | 178 |
| Students | 150 |
| Current Enrollments | ~750-900 |
| Historical Enrollments | ~1,200 |
| Payment Records | ~600 |
| Credential Files | 178 |

### Lines of Code

```
Backend (Python):              ~1,500 LOC
Frontend (JavaScript/React):   ~2,000 LOC
Population scripts:             ~500 LOC
Configuration and utilities:    ~300 LOC
────────────────────────────────────────
Total:                         ~4,300 LOC
```

---

## 🎨 UI Design

### Design Features

- ✅ **Consistent design system**
  - Institutional color palette
  - Typography: Arial/Sans-serif
  - Icons: Lucide React

- ✅ **Responsive Design**
  - Automatic mobile adaptation
  - Optimized for tablets
  - Full desktop support

- ✅ **Reusable Components**
  - Dashboard Cards
  - Dynamic Tables
  - Validated Forms
  - Modals and notifications

- ✅ **Smooth Animations**
  - Transitions with Framer Motion
  - Immediate visual feedback
  - Loading states

### Main Views

#### 1. Login / Authentication
```jsx
// Clean and professional access screen
- Real-time credential validation
- Session management with JWT
- Password recovery
- Centered and minimalist design
```

#### 2. Role-Based Dashboard
```jsx
// Custom view according to authenticated user role
- Cards with relevant KPIs
- Interactive charts (Recharts)
- Quick access to main functions
- Intuitive navigation
```

#### 3. Data Management
```jsx
// Responsive tables with complete functionality
- Automatic pagination
- Column sorting
- Real-time search and filtering
- Inline actions (edit, delete, view)
```

---

## 🗺️ Roadmap

### ✅ Version 1.0 (Current)
- [x] Complete RBAC system
- [x] Financial module with blocks
- [x] Grade management
- [x] Analytical dashboard
- [x] Population scripts

### 🚧 Version 1.1 (Planned)
- [ ] Real-time notifications (WebSockets)
- [ ] PDF report export
- [ ] Internal messaging system
- [ ] Integrated academic calendar

### 🔮 Version 2.0 (Future)
- [ ] PostgreSQL migration
- [ ] Payment system integration (Stripe/PayPal)
- [ ] Native mobile app (React Native)
- [ ] Biometric attendance system
- [ ] Digital library module

---

## 🤝 Contributing

This is a personal portfolio project, but I'm open to suggestions and feedback.

### How to Contribute

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Code Standards

- **Python:** Follow PEP 8
- **JavaScript:** Use Airbnb ESLint config
- **Commits:** Conventional Commits
- **Documentation:** Docstrings in important functions

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📞 Contact

**Arin Romero**

- Email: ariin.romeror@gmail.com
- GitHub: [@ariinromeror](https://github.com/ariinromeror)

---

## 🙏 Acknowledgments

This project was developed using:
- AI-Driven methodology to accelerate development
- Best practices from Django and React communities
- Established enterprise design patterns
- Feedback from senior developers

---

## 📚 Additional Resources

### Documentation
- [Django Documentation](https://docs.djangoproject.com/)
- [React Documentation](https://react.dev/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [Tailwind CSS](https://tailwindcss.com/)

### Related Tutorials
- [Building RESTful APIs with Django](https://realpython.com/django-rest-framework-quick-start/)
- [React Best Practices](https://react.dev/learn/thinking-in-react)
- [JWT Authentication in Django](https://simpleisbetterthancomplex.com/tutorial/2018/12/19/how-to-use-jwt-authentication-with-django-rest-framework.html)

---

<div align="center">

**⭐ If you found this project useful, don't forget to give it a star ⭐**

*Developed with ❤️ as a professional portfolio project*

</div>