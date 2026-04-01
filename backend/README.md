# Backend API (Express)

## Quick start

1. Install dependencies:
   - `npm install`
2. Create env file:
   - See .env.example for required environment variables


3. Run in development:
   - `npm run dev`
4. Run in production mode:
   - `npm start`

## Base routes

- `GET /` - welcome route
- `GET /api/v1/health` - health check

## Suggested structure

```text
src/
  config/       # environment and app config
  controllers/  # route controllers
  middlewares/  # custom middlewares
  models/       # database models
  routes/       # express route modules
  services/     # business logic
  utils/        # shared helper functions
  app.js        # express app configuration
  server.js     # app startup
```