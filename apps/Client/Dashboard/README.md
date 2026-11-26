# @ticket-system/dashboard

This is the Admin Dashboard for the Ticket System.

## Development

- Mind that this project relies on the Server Application.
- To reach it you have to run it and then use the ports in the .env file in this directory.
- Create a `.env` file with the required environment variables (see Environment Variables section below).
- Then run:

```bash
npm install
npm run dev
```

- The Dashboard will be served on port 5173.

## Environment Variables

Create a `.env` file in the Dashboard directory with the following variables:

```bash
VITE_API_VERSION=2.2.7
```

You can also create environment-specific files:
- `.env.development` - for development environment
- `.env.production` - for production environment
- `.env.local` - for local overrides (not committed to git)

## Production

- Please just use the documentation provided in the [README](../../README.md) of the root directory.