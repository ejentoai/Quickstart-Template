# Quick-start Ejento AI Template

A flexible Next.js template for building AI-powered chat applications with the Ejento AI platform. This template provides a complete chat interface with streaming responses, message history, flexible configuration options and authentication flow. Users are encouraged to build upon this template to utilize Ejento AI's capabilities by taking advantage of [Ejento AI APIs](https://api.ejento.ai/).

The [Quick-start Template for Building an App Guide](https://api.ejento.ai/guide/quick-start-template-for-building-an-app) will walk you through the steps required to get started.

## 🚀 Features

### Core Functionality
- **Message History**: Persistent chat threads organized by date (today, yesterday, last week, etc.) 
- **Streaming Responses**: Real-time streaming of AI responses with typewriter effect
- **Thread Management**: Create, navigate, and organize multiple chat conversations
- **Public Agent Mode**: Support for public-facing AI agents 
  - **Multi-Database Support**: Flexible database configuration in Public Agent Mode using Prisma ORM, with support for different databases.
  - **Flexible user identification:**
   - **Anonymous Users**: Browser session-based chat history stored in Prisma-managed Database when authentication is disabled
   - **Authenticated Users**: User account-based chat history stored in database when authentication is enabled
- **Persistent Configuration**: API credentials stored securely in the database for manual configuration mode

### Developer Experience
- **TypeScript**: Fully typed codebase for better development experience
- **Modern Stack**: Next.js 15, React 19, Tailwind CSS, Prisma ORM
- **Component Library**: Built with Radix UI and shadcn/ui components
- **Flexible Configuration**: Environment-driven and manual configuration modes with database persistence
- **Database Flexibility**: Prisma ORM allows switching between different database providers without code changes
- **Secure Authentication Flow**: Supports authentication flow

## 📋 Requirements

### System Requirements
- **Node.js**: Version 20 or higher
- **npm**: Version 7 or higher (or yarn/pnpm/bun)
- **Database**: Prisma supported databases such as PostgreSQL (local & Supabase), MySQL, etc
- **Modern Browser**: Chrome, Firefox, Safari, or Edge (latest versions)

### API Requirements

- Refer to the [documentation](https://docshub.ejento.ai/tutorials/apikeys) to retrieve your Base URL, API Key, Agent ID, and Access Token (only if authentication is disabled) from Ejento AI.
- **Ejento API Access**: Valid Ejento API credentials are required. The credentials required depend on whether authentication is enabled or disabled:

  **1. Authentication Enabled**
  - The Access Token will be issued automatically after successful user authentication.
  - During configuration, the user only needs:
    - Base URL for your Ejento API instance
    - API Key (Ocp-Apim-Subscription-Key)
    - Agent ID

  **2. Authentication Disabled**
  - The user must provide all credentials during configuration:
    - Base URL for your Ejento API instance
    - API Key (Ocp-Apim-Subscription-Key)
    - Ejento Access Token
    - Agent ID

  - For retrieving Ejento Access Token before its expiration (7 days), refer the Guide [here](https://api.ejento.ai/getting-started-with-authentication).

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Quickstart-Template
```

### 2. Install Dependencies

```bash
npm install --legacy-peer-deps
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
# Copy from example (if available) or create new
touch .env
```

Add the following environment variables:

```env
NODE_ENV=production

# Database Configuration (Required for all modes)
# Supports any Prisma-compatible database
# Examples:
# PostgreSQL: "postgresql://username:password@localhost:5432/ejento_db"
# MySQL: "mysql://username:password@localhost:3306/ejento_db"
# SQLite: "file:./dev.db"

DATABASE_URL="postgresql://username:password@localhost:5432/ejento_db"

# Enable environment-driven configuration
NEXT_PUBLIC_ENV_DRIVEN=true

# Feature flag to enable authentication
NEXT_PUBLIC_AUTH_FLOW=true

# Ejento API Configuration
EJENTO_BASE_URL=https://api.yourdomain.com
EJENTO_API_KEY=your-ocp-apim-subscription-key
# Required only if authentication is disabled; otherwise, it is provided automatically after login
EJENTO_ACCESS_TOKEN=Bearer your-access-token
EJENTO_AGENT_ID=your-agent-id

NEXT_PUBLIC_APP_URL=<YOUR_APP_BASE_URL>   # Replace with your app's URL (e.g., http://localhost:3000 for dev, https://yourapp.com for production)

# Public Agent Mode (for public-facing AI agents)
NEXT_PUBLIC_AGENT=false

# Optional: Customize UI
NEXT_PUBLIC_AGENT_IMAGE=https://example.com/agent-logo.png
NEXT_PUBLIC_AGENT_HEADER_TEXT=Your Custom Header Text

# Enable streaming chat
NEXT_PUBLIC_STREAM_CHAT=true

# A JWT Secret Key of your choice for encryption of chatId
NEXT_PUBLIC_SECRET_KEY=secret-key-for-encryption
```

### 4. Set Up Database

The application uses Prisma ORM with configurable database support. You can connect to any online or offline database supported by Prisma, such as MySQL, PostgreSQL, or services like Supabase (which provides a hosted PostgreSQL database), etc. Simply update the `DATABASE_URL` in your `.env` file and ensure that the connection string matches the correct provider specified in the schema.prisma file. The provider defined in schema.prisma and the connection string must correspond to the same database type.

The database stores:
- **Public Agent Mode**: Chat history with dual user identification (session-based for anonymous users, user-based for authenticated users)
- **Manual Configuration**: API credentials and settings when `NEXT_PUBLIC_ENV_DRIVEN=false`

Run the following commands to set up your database:

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# (Optional) View your database with Prisma Studio
npx prisma studio
```

### 5. Start the Development Server

```bash
npm run dev
```

## Switching Between Databases

This project supports multiple Prisma database providers.  
To switch from one database (e.g., MySQL) to another (e.g., PostgreSQL), follow these steps:

### 1️⃣ Update the Database Provider

Edit the `schema.prisma` file and change the `provider` inside the `datasource` block:

```prisma
datasource db {
  provider = "postgresql" // or "mysql"
  url      = env("DATABASE_URL")
}

### 2️⃣ Update the Environment Variable

```bash
DATABASE_URL=your-new-database-connection-string
```

### 3️⃣ Reset Migrations (Required When Changing Database Engines)

Delete the existing migrations folder inside the prisma directory before running new migrations.
This ensures compatibility with the new database provider.

### 4️⃣ Regenerate Prisma Client and Apply Migrations

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

```

### 5. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## ⚙️ Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Database connection string (supports PostgreSQL, MySQL, SQLite, MongoDB, etc.) | `postgresql://user:pass@localhost:5432/db` |
| `NEXT_PUBLIC_ENV_DRIVEN` | Enable environment-driven configuration | `true` |
| `NEXT_PUBLIC_AUTH_FLOW` | Enable authentication flow | `true` |
| `EJENTO_BASE_URL` | Base URL for Ejento AI API server | `https://{your-server-name}` |
| `EJENTO_API_KEY` | API subscription key | `your-ocp-apim-subscription-key` |
| `EJENTO_ACCESS_TOKEN` | Authentication access token |Bearer `your-access-token` |
| `EJENTO_AGENT_ID` | Agent ID | `123` |
| `NEXT_PUBLIC_APP_URL` | Your app Base URL | `https://yourapp.com` |
| `NEXT_PUBLIC_AGENT` | Enable public agent mode | `false` |
| `NEXT_PUBLIC_AGENT_IMAGE` | Custom agent logo/image URL | Uses default Ejento AI logo |
| `NEXT_PUBLIC_AGENT_HEADER_TEXT` | Custom header text for agent | Default header |
| `NEXT_PUBLIC_STREAM_CHAT` | Enable streaming chat responses | `true` |
| `NEXT_PUBLIC_SECRET_KEY` | Secret key for encryption | A JWT Secret Key of your choice|

## 🎯 Application Behavior

### Public Agent Mode - Dual User Identification

When `NEXT_PUBLIC_AGENT=true` is enabled, the application supports two distinct modes of user identification with all data stored in your configured database:

#### 1. Anonymous Users (Authentication Disabled - `NEXT_PUBLIC_AUTH_FLOW=false`)
- Anonymous users can access the AI agent without logging in
- Each browser session maintains its own isolated chat history in the database
- Chat history is linked to browser session IDs for complete isolation between users
- Users can only access chats from their current browser session
- Chat history persists across page reloads within the same session
- Data is stored in the database with session-based associations

#### 2. Authenticated Users (Authentication Enabled - `NEXT_PUBLIC_AUTH_FLOW=true`)
- Users must log in before accessing the AI agent
- Chat history is tied to the authenticated user account in the database
- Users can access their chat history across multiple devices and sessions
- Provides persistent chat history that follows the user wherever they log in
- All conversations are stored in the database with user ID associations
- Ideal for production applications with registered users


### Configuration Flow

1. **Initial Load**: The application checks for configuration in this order:
   - Environment variables (if `NEXT_PUBLIC_ENV_DRIVEN=true`)
   - Database-stored configuration from the Configuration model (for manual mode)
   - Redirects to settings if no configuration found

2. **Validation**: All configurations are automatically validated:
   - Credential validation (requires API key and access token if auth is disabled, otherwise only API key)
   - Agent validation (confirms agent exists and is accessible)
   - User data fetching (automatically retrieves user information)

3. **Routing**:
   - **Authentication Enabled (`NEXT_PUBLIC_AUTH_FLOW=true`)**: Routes to `/auth/login` for user authentication
   - **Authentication Disabled (`NEXT_PUBLIC_AUTH_FLOW=false`)**: Routes directly to `/chat`
   - **Invalid/Missing Configuration**: Routes to `/settings` or shows error message
   - **Environment-Driven Mode**: Settings page is disabled, configuration loaded from env vars

### Chat Features

- **Streaming Responses**: Real-time streaming of AI responses
- **Message History**: Persistent chat threads with date-based organization stored in your database
- **Message Actions**: Upvote, downvote, regenerate and provide feedback to responses
- **Thread Management**: Create new chats, navigate between threads

## 🎨 Use Cases

### 1. Internal AI Assistant with User Tracking
Deploy as an internal AI assistant for your organization:
- Enable authentication to track usage by employee
- Each user sees their own chat history stored in the central database
- All chat history stored centrally for analytics and compliance
- Use environment-driven configuration for security
- Deploy with PostgreSQL for production reliability(in Public Agent Mode)

### 2. Public AI Agent (Anonymous Access)
Create a public-facing AI agent for anonymous users:
- Enable `NEXT_PUBLIC_AGENT=true` and set `NEXT_PUBLIC_ENV_DRIVEN=true`
- Disable authentication: `NEXT_PUBLIC_AUTH_FLOW=false`
- Users access the agent without login
- Chat history stored in database with session-based isolation
- Perfect for demos, landing pages, or public tools

### 3. Public AI Agent (Registered Users)
Create a public-facing AI agent for registered users:
- Enable `NEXT_PUBLIC_AGENT=true` and set `NEXT_PUBLIC_ENV_DRIVEN=true`
- Enable authentication: `NEXT_PUBLIC_AUTH_FLOW=true`
- Users must register/login to access the agent
- Chat history follows users across devices via database storage

### 4. Development/Testing Environment
Use for local development and testing:
- Manual configuration mode for flexibility
- Easy switching between different Agents when `NEXT_PUBLIC_ENV_DRIVEN=false` and `NEXT_PUBLIC_AGENT=false`
- Full access to settings page with database-stored configurations

### 5. White-Label Solution
Customize for clients:
- Environment-driven configuration per deployment
- Custom branding and styling
- Choose between anonymous or authenticated user models
- Centralized chat history storage per client in their preferred database (Public Agent Mode). 
  Otherwise, chat history is stored in the application's backend database.

### 6. Hybrid Deployment
Support both anonymous and authenticated users:
- Start with anonymous access for trial users
- Encourage registration to save chat history permanently
- Seamless transition from session-based to user-based history
- All data stored in same database with proper associations

## 📁 Project Structure

```
ejento_template/
├── prisma/
│   ├── migrations/      # Database migrations (provider-specific)
│   └── seeds/           # Database seed data
├── src/
│   ├── app/              # Next.js app router pages
│   │   ├── api/          # API routes (config, ejento-config, message, thread, session, user, proxy, sso, etc.)
│   │   ├── auth/         # Authentication-related pages (login, register)
│   │   ├── chat/         # Chat page
│   │   ├── settings/     # Settings page
│   │   └── context/      # React contexts (auth, config)
│   ├── components/       # React components
│   │   ├── authentication # Login/register components
│   │   ├── chat/         # Chat-related components
│   │   └── ui/           # UI component library
│   ├── generated/        #auto-generated code created by Prisma
│   │   ├── prisma # Prisma Client output directory
│   │   │   ├── runtime # Internal Prisma engine/runtime files
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility libraries
├── public/               # Static assets
├── Dockerfile           # Docker configuration
└── package.json         # Dependencies and scripts
```

## 🗄️ Database Schema

The Prisma schema includes the following main models, all of which work with any supported database provider:

- **User**: Stores authenticated user information for registered users
- **Session**: Tracks anonymous browser sessions with unique session IDs
- **EjentoConfig**: Stores API credentials and settings for manual configuration mode
- **Thread**: Stores thread information for chat conversations, linked to either a User (authenticated) or an Session (anonymous users).
- **Message**: Stores individual messages within chats with proper foreign key relationships

## Key Relationships

### Authenticated Users (`User`)
- Each user can own multiple threads.  
- Each user has a single configuration (`EjentoConfig`) storing API keys, tokens, and agent settings.

### Anonymous Users (`Session`)
- Threads created by anonymous users are linked to a session, providing session-based isolation.  
- Each session can have multiple threads.

### Threads (`Thread`)
- Each thread belongs to either a **User** (authenticated) or a **Session** (anonymous).  
- Each thread contains multiple messages (`Message`).  
- Optionally linked to an external API ID (`externalApiId`) for integration with Ejento AI.

### Messages (`Message`)
- Each message belongs to exactly one thread.  
- Deleting a thread automatically deletes all its messages (`onDelete: Cascade`).  
- Each message has a role (**user** or **assistant**) and optional metadata.

### Configuration (`EjentoConfig`)
- Each user can have one configuration.  
- Stores API keys, base URLs, agent IDs, and optional access tokens.

## 🔐 Authentication Modes

### Mode 1: Authentication Disabled (Anonymous Users)
```env
NEXT_PUBLIC_AUTH_FLOW=false
NEXT_PUBLIC_AGENT=true  # or false
```
- Users access chat immediately
- No login required

### Mode 2: Authentication Enabled (Registered Users)
```env
NEXT_PUBLIC_AUTH_FLOW=true
NEXT_PUBLIC_AGENT=true  # or false
```
- Users redirected to login page
- Ideal for production applications

## 🐛 Troubleshooting

### Database Issues

**Problem**: "Can't reach database server"
- ✅ Verify your database is running: Check provider-specific commands
- ✅ Check `DATABASE_URL` connection string format for your provider
- ✅ Ensure database exists and is accessible
- ✅ Check network/firewall settings

**Problem**: "Prisma migration failed"
- ✅ Run `npx prisma migrate reset` to reset (development only)
- ✅ Check migration history: `npx prisma migrate status`
- ✅ Ensure database user has sufficient privileges
- ✅ Verify your database version is compatible with Prisma

**Problem**: "Configuration not persisting"
- ✅ Check database connection in Prisma Studio: `npx prisma studio`
- ✅ Verify the Configuration model exists in the database
- ✅ Check browser console for API errors when saving settings
- ✅ For manual mode: Ensure `NEXT_PUBLIC_ENV_DRIVEN=false`

**Problem**: "Chat history not loading"
- ✅ For authenticated mode: Verify user is logged in and has user ID
- ✅ For session mode: Check session cookies are being set properly
- ✅ Verify database connection for Chat/Message models
- ✅ Check API response for chat history endpoint
- ✅ Confirm foreign key relationships in database

### **Problem**: Switching Database Providers

- ✅ Update the `provider` in the `datasource` block of your `schema.prisma` file (e.g., `"mysql"` → `"postgresql"`)  
- ✅ Update the `DATABASE_URL` in the `.env` file to match the new database  
- ✅ Delete the existing `migrations` folder inside the `prisma` directory (required when switching database engines)  
- ✅ Run `npx prisma generate` to regenerate the Prisma Client  
- ✅ Run `npx prisma migrate dev --name init` to create fresh migrations for the new database  

### Authentication Issues

**Problem**: "Cannot login"
- ✅ Verify `NEXT_PUBLIC_AUTH_FLOW=true` is set
- ✅ Check email/OTP entry format
- ✅ Ensure user exists in database
- ✅ Check authentication API endpoints
- ✅ Verify database connection for User model

**Problem**: "Session expired"
- ✅ Check session duration configuration in database
- ✅ Clear browser cookies and retry
- ✅ Check Session table for expired sessions

### Configuration Issues

**Problem**: "Configuration Validation Failed"
- ✅ Check that all environment variables are set correctly
- ✅ Verify your API credentials are valid
- ✅ If authentication is disabled, ensure Ejento Access Token is set and not expired
- ✅ Ensure the API endpoint is accessible from your server
- ✅ Restart the server after updating environment variables
- ✅ For manual mode: Check Configuration table in database

**Problem**: "Configuration Required"
- ✅ If using env-driven mode: Ensure `NEXT_PUBLIC_ENV_DRIVEN=true` and all `EJENTO_*` vars are set
- ✅ If using manual mode: Navigate to `/settings` and configure the application
- ✅ Check browser console for additional error messages
- ✅ Verify database can store configuration records

### Build Issues

**Problem**: Build fails with dependency errors
- ✅ Use `npm install --legacy-peer-deps` 
- ✅ Clear `node_modules` and `package-lock.json`, then reinstall
- ✅ Ensure Node.js version is 20 or higher
- ✅ Check Prisma version compatibility with your database

### Runtime Issues

**Problem**: Chat not loading or streaming not working
- ✅ Check browser console for errors
- ✅ Verify API credentials are valid and not expired
- ✅ Check network tab to see if API calls are successful
- ✅ Ensure `NEXT_PUBLIC_STREAM_CHAT=true` if using streaming
- ✅ Verify database can retrieve chat history

**Problem**: Messages not persisting
- ✅ Check database tables in Prisma Studio to verify messages are being saved
- ✅ Verify API endpoints for chat history are accessible
- ✅ Check for errors in browser console when saving messages
- ✅ Check foreign key constraints in Message table

**Problem**: "Slow query performance"
- ✅ Add database indexes to frequently queried fields
- ✅ Optimize Prisma queries with select/include
- ✅ Consider database-specific optimizations
- ✅ Monitor query performance with Prisma logging

## 📝 License

MIT License

## 🤝 Contributing

This is a template repository. Feel free to:
- Fork and customize for your needs
- Report issues or suggest improvements
- Share your customizations with the community
- Contribute database provider-specific optimizations

## 📚 Additional Resources

- [Ejento AI Documentation](https://docshub.ejento.ai/)
- [Ejento AI API Documentation](https://api.ejento.ai/)
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Database Providers Guide](https://www.prisma.io/docs/concepts/database-connectors)
- [PostgreSQL Documentation](https://www.postgresql.org/docs)
- [MySQL Documentation](https://dev.mysql.com/doc)
- [MongoDB Documentation](https://docs.mongodb.com)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Authentication Patterns](https://nextjs.org/docs/authentication)

## 🆘 Support

For issues related to:
- **Template/Code**: Open an issue in this repository
- **Ejento AI APIs**: Contact your Ejento AI provider via `developer.support@ejento.ai`
- **Deployment**: Refer to your hosting platform's documentation
- **Prisma ORM**: Check [Prisma's documentation](https://www.prisma.io/docs) or [GitHub issues](https://github.com/prisma/prisma)

---

**Built with ❤️ using Next.js, React, and Prisma - Database agnostic and ready for any scale**