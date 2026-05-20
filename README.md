# Ticketing System - Modernized (AI Helpdesk)

A comprehensive case study modernizing a legacy web-based ticketing tool from 2018 to a cloud-native architecture using modern technologies.

## 📋 Project Overview

**Legacy Stack (2018):**
- Frontend: Angular 6.1.10
- Backend: PHP CodeIgniter 3.1.8
- Database: MySQL
- Hosting: Shared Hosting (BigRock.in)

**Modern Stack (2025):**
- Frontend: React 18 + TypeScript + Tailwind CSS
- Backend: Node.js 20 + Express.js
- Database: PostgreSQL 15
- Hosting: Docker + Docker Compose (Ready for AWS/Azure/GCP)
- CI/CD: GitHub Actions ready

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for development without Docker)
- Git

### Setup with Docker (Recommended)

```bash
# Clone or navigate to project directory
cd ticketing-app

# Build and start all services
docker-compose up --build

# Services will be available at:
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000
# PostgreSQL: localhost:5432
```

### Setup without Docker

#### Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Create .env file (copy from provided template)
cp .env.example .env

# Update environment variables in .env
# Especially JWT_SECRET and EMAIL credentials

# Start the server
npm run dev
```

#### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Update API URL if needed
VITE_API_URL=http://localhost:5000/api

# Start the development server
npm run dev
```

## 👥 Demo Accounts

Login with these test accounts:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@ticketing.com | admin123 |
| Support Agent | support@ticketing.com | support123 |
| Customer | customer@ticketing.com | customer123 |

## 📚 Project Structure

```
ticketing-app/
├── backend/                    # Node.js/Express backend
│   ├── server.js              # Main server file
│   ├── package.json           # Backend dependencies
│   ├── Dockerfile             # Docker configuration
│   └── .env                   # Environment variables
├── frontend/                  # React frontend
│   ├── src/
│   │   ├── pages/            # Page components
│   │   ├── components/       # Reusable components
│   │   ├── store/            # Zustand state management
│   │   ├── styles/           # CSS modules
│   │   ├── App.jsx           # Main app component
│   │   └── main.jsx          # Entry point
│   ├── index.html            # HTML template
│   ├── package.json          # Frontend dependencies
│   ├── Dockerfile            # Docker configuration
│   └── vite.config.js        # Vite configuration
├── docker-compose.yml        # Multi-container setup
└── README.md                 # This file
```

## 🎯 Features

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (Admin, Support Agent, Customer)
- Secure password hashing with bcryptjs

### Ticket Management
- Create, read, update tickets
- Priority levels (Low, Medium, High)
- Status tracking (Open, In Progress, Closed)
- Ticket assignment to support agents
- Full comment system

### User Roles
- **Admin**: Full system access, user management, statistics
- **Support Agent**: Assign and manage tickets, add comments
- **Customer**: Create tickets, add comments, track status

### Notifications
- Email notifications for ticket creation
- Ticket assignment alerts
- Comment notifications

## 🔒 Security Features

- **JWT Authentication**: Token-based authentication
- **Password Security**: Bcryptjs hashing with salt rounds
- **CORS Protection**: Configured CORS middleware
- **Helmet.js**: HTTP security headers
- **Input Validation**: Express-validator for all inputs
- **Role-Based Access Control**: Middleware-based authorization

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Tickets
- `GET /api/tickets` - Get all tickets (filtered by role)
- `GET /api/tickets/:id` - Get single ticket
- `POST /api/tickets` - Create ticket
- `PUT /api/tickets/:id` - Update ticket

### Comments
- `GET /api/tickets/:id/comments` - Get ticket comments
- `POST /api/tickets/:id/comments` - Add comment

### Admin
- `GET /api/admin/users` - Get all users
- `GET /api/admin/stats` - Get system statistics

## 🛠️ Development

### Running Tests
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### Building for Production
```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run build
```

### Code Quality
```bash
# Frontend linting
cd frontend
npm run lint
```

## 📈 Performance Optimizations

- **Frontend**: Code splitting with React.lazy, lazy image loading
- **Backend**: Request caching, database query optimization
- **Infrastructure**: CDN-ready with static asset serving
- **Database**: Indexed queries, connection pooling

## 🔄 Migration Strategy (From Legacy)

The system is designed for a phased migration:

1. **Phase 1**: Infrastructure setup (Docker, CI/CD)
2. **Phase 2**: Core features development
3. **Phase 3**: Data migration and cutover
4. **Phase 4**: Legacy system sunset

## 📦 Deployment

### Docker Production Build
```bash
docker-compose -f docker-compose.yml up -d
```

### AWS ECS Deployment
```bash
# Build and push images
docker build -t ticketing-frontend:latest frontend/
docker build -t ticketing-backend:latest backend/

# Tag for ECR
docker tag ticketing-frontend:latest <aws-account>.dkr.ecr.<region>.amazonaws.com/ticketing-frontend:latest
docker tag ticketing-backend:latest <aws-account>.dkr.ecr.<region>.amazonaws.com/ticketing-backend:latest

# Push to ECR
docker push <aws-account>.dkr.ecr.<region>.amazonaws.com/ticketing-frontend:latest
docker push <aws-account>.dkr.ecr.<region>.amazonaws.com/ticketing-backend:latest
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill process on port
lsof -ti:3000 | xargs kill -9  # Frontend
lsof -ti:5000 | xargs kill -9  # Backend
```

### Database Connection Error
```bash
# Verify PostgreSQL is running
docker ps | grep postgres

# Check logs
docker logs <postgres-container-id>
```

### CORS Errors
Ensure `CORS_ORIGIN` in backend `.env` matches your frontend URL.

## 📝 Environment Variables

### Backend (.env)
```
PORT=5000
NODE_ENV=development
JWT_SECRET=your-secret-key
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ticketing_system
DB_USER=postgres
DB_PASSWORD=postgres
CORS_ORIGIN=http://localhost:3000
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000/api
```

## 🎓 Learning Resources

- [React Documentation](https://react.dev)
- [Express.js Guide](https://expressjs.com)
- [PostgreSQL Docs](https://www.postgresql.org/docs)
- [Docker Learning](https://docs.docker.com)

## 📞 Support & Contact

For issues, feature requests, or questions:
1. Check existing documentation
2. Review error logs
3. Create an issue with detailed reproduction steps

## 📄 License

This project is a modernization case study. Use as reference for your own projects.

## 🎉 Next Steps

1. **Customize**: Modify database schema and API routes
2. **Enhance UI**: Add more advanced features and styling
3. **Deploy**: Set up on AWS, Azure, or Google Cloud
4. **Monitor**: Implement logging and monitoring solutions
5. **Scale**: Add caching, load balancing, and auto-scaling

---

**Built with ❤️ for modern web development**
EOF
