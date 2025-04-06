# Epic Stack Template

This project is built on the Epic Stack, a comprehensive full-stack JavaScript/TypeScript solution for building web applications.

## Architecture Overview

This application follows a modern web architecture with:

- **Frontend**: React with React Router for client-side navigation
- **Backend**: Node.js with Express
- **Database**: SQLite via Prisma ORM
- **Authentication**: Custom auth with GitHub OAuth integration
- **File Storage**: S3-compatible storage via Tigris Object Storage
- **Monitoring**: Sentry for error tracking and performance monitoring

## Key Dependencies

### Core Framework
- React Router v7 for routing
- Prisma for database ORM
- Conform for form validation
- Zod for schema validation

### UI Components
- Radix UI for accessible component primitives
- Tailwind CSS for styling
- Custom icon spritesheet system

### Development Tools
- Vite for development and building
- TypeScript for type safety
- Vitest for unit testing
- Playwright for end-to-end testing

## Deployment Options

### Local Development

1. **Setup Environment**:
   ```bash
   # Clone the repository
   git clone <repository-url>
   cd epic-stack-template
   
   # Copy environment variables
   cp .env.example .env
   
   # Install dependencies
   npm install
   
   # Setup database
   npm run setup
   ```

2. **Run Development Server**:
   ```bash
   # With mocks enabled
   npm run dev
   
   # Without mocks
   npm run dev:no-mocks
   ```

3. **Testing**:
   ```bash
   # Run unit tests
   npm test
   
   # Run E2E tests
   npm run test:e2e
   ```

### Docker Deployment

1. **Build Docker Image**:
   ```bash
   docker build -t epic-stack-app .
   ```

2. **Run Container**:
   ```bash
   docker run -p 3000:3000 --env-file .env epic-stack-app
   ```

3. **Docker Compose** (for multi-container setup):
   ```bash
   docker-compose up -d
   ```

### Remote Deployment

1. **Fly.io Deployment**:
   ```bash
   # Install Fly CLI
   curl -L https://fly.io/install.sh | sh
   
   # Login to Fly
   fly auth login
   
   # Deploy the application
   fly launch
   fly deploy
   
   # Set secrets
   fly secrets set SESSION_SECRET=your-secret-value
   ```

2. **Vercel/Netlify Deployment**:
   - Connect your GitHub repository
   - Configure build settings:
     - Build command: `npm run build`
     - Output directory: `build`
   - Set environment variables in the platform dashboard

3. **Custom VPS Deployment**:
   ```bash
   # Build the application
   npm run build
   
   # Start production server
   npm start
   ```

## Environment Configuration

Key environment variables (see `.env.example` for full list):
- `DATABASE_URL`: SQLite database connection string
- `SESSION_SECRET`: Secret for session encryption
- `GITHUB_CLIENT_ID` & `GITHUB_CLIENT_SECRET`: GitHub OAuth credentials
- AWS/S3 credentials for file storage
- `SENTRY_DSN`: Sentry monitoring configuration

## Development Best Practices

1. **Code Style**:
   - Run `npm run format` to format code with Prettier
   - Run `npm run lint` to check for linting issues

2. **Type Safety**:
   - Run `npm run typecheck` to verify TypeScript types

3. **Testing**:
   - Write unit tests with Vitest
   - Create E2E tests with Playwright

4. **Validation**:
   - Run `npm run validate` to run all checks before committing

5. **Database Changes**:
   - Use Prisma migrations for database schema changes

