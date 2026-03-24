# Quick-start Ejento AI Template

A flexible Next.js template for building AI-powered chat applications with the Ejento AI platform. This template provides a complete chat interface with streaming responses, message history, support for file uploads and attachments, flexible configuration options, and authentication flow. Users are encouraged to build upon this template to utilize Ejento AI's capabilities by taking advantage of [Ejento AI APIs](https://api.ejento.ai/).

The [Quick-start Template for Building an App Guide](https://api.ejento.ai/guide/quick-start-template-for-building-an-app) will walk you through the steps required to get started.

## 🚀 Features

### Core Functionality
- **Message History**: Persistent chat threads organized by date (today, yesterday, last week, etc.) 
- **Message History**: Persistent chat threads organized by date (today, yesterday, last week, etc.) 
- **Streaming Responses**: Real-time streaming of AI responses with typewriter effect
- **Thread Management**: Create, navigate, and organize multiple chat conversations
- **File Upload & Attachments**: Support for uploading documents, images, and various file formats to enable content-based conversations

  - **Multi-format Support**: PDF, Word, Excel, CSV, PPTX, RTF, Images, Text, JSON, XML, HTML, and more
  - **Weblink Integration**: Direct URL upload for online documents and webpages
  - **Plain Text Input**: Direct text paste support
  - **Content-based Queries**: Upload content and ask questions based on the content

- **Public Agent Mode**: Support for public-facing AI agents 

  - **Multi-Database Support**: Flexible database configuration in Public Agent Mode using Prisma ORM
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
# NODE_ENV can be production or development
NODE_ENV=production

# Database Configuration (Required for all modes)
# Supports any Prisma-compatible database
# Examples:
# PostgreSQL: "postgresql://username:password@localhost:5432/ejento_db"
# MySQL: "mysql://username:password@localhost:3306/ejento_db"

DATABASE_URL="provider://username:password@localhost:5432/db_name"

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

### 4. Database Setup

The application uses Prisma ORM with configurable database support. You can connect to any online or offline database supported by Prisma, such as MySQL, PostgreSQL, or services like Supabase (which provides a hosted PostgreSQL database), etc. 

### 1️⃣ Set the Database Provider

Edit the `schema.prisma` file and set the `provider` inside the `datasource` block:

```prisma
datasource db {
  provider = "postgresql" // or "mysql"
  url      = env("DATABASE_URL")
}
```
### 2️⃣ Set the Environment Variable

```bash
DATABASE_URL=your-new-database-connection-string
```

The database stores:
- **Public Agent Mode**: Chat history with dual user identification (session-based for anonymous users, user-based for authenticated users)
- **Manual Configuration**: API credentials and settings when `NEXT_PUBLIC_ENV_DRIVEN=false`

Run the following commands to set up your database:

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

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
```
### 2️⃣ Update the Environment Variable

```bash
DATABASE_URL=your-new-database-connection-string
```

### 4️⃣ Regenerate Prisma Client

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

```

### 5. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## ⚙️ Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Database connection string (supports PostgreSQL, MySQL, etc.) | `provider://username:password@localhost:5432/db_name` |
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
| `INDEXING_SERVICE_KEY` | Subscription key for the indexing service | `your-indexing-service-subscription-key` |
| `INDEXING_SERVICE_HEADER` | Header name for the indexing service subscription key | `Ocp-Apim-Subscription-Key` |


## 🎯 Application Behavior

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

- **Streaming Responses**: Real-time streaming of AI responses with typewriter effect
- **File Attachments**: Upload and process multiple file types within conversations
- **Content-based Q&A**: Ask questions about uploaded documents and images
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

### 2. Public AI Agent
Create a public-facing AI agent:
- Enable `NEXT_PUBLIC_AGENT=true` and set `NEXT_PUBLIC_ENV_DRIVEN=true` for public agent mode
- Same Agent exposed to multiple users. Browser based session management for anonymous access. 
- **Note**: The Author's credentials will be utilized for authentication and interaction with Ejento AI, however users will only be able to see the chats of their own browser session

### 3. Development/Testing Environment
Use for local development and testing:
- Manual configuration mode for flexibility
- Easy switching between different Agents when `NEXT_PUBLIC_ENV_DRIVEN=false` and `NEXT_PUBLIC_AGENT=false`
- Full access to settings page with database-stored configurations

### 4. White-Label Solution
Customize for clients:
- Environment-driven configuration per deployment
- Custom branding and styling
- Isolated credential management

### 6. Hybrid Deployment
Support both anonymous and authenticated users:
- Start with anonymous access for trial users
- Encourage registration to save chat history permanently
- Seamless transition from session-based to user-based history

## 📁 Project Structure

```
ejento_template/
├── prisma/
│   ├── migrations/      # Database migrations (provider-specific)
│   └── seeds/           # Database seed data
├── src/
│   ├── app/              # Next.js app router pages
│   │   ├── api/          # API routes (proxy, config, sso)
│   │   ├── auth/         # authentication-related pages
│   │   ├── chat/         # Chat page
│   │   ├── settings/     # Settings page
│   │   └── context/      # React contexts (auth, config)
│   ├── components/       # React components
│   │   ├─ authentication # authentication-related components
│   │   ├─ chat/         # Chat-related components
│   │   └── ui/           # UI component library
│   ├── generated/        #auto-generated code created by Prisma
│   │   ├── prisma        #Prisma Client output directory
│   │   │   ├── runtime   #Internal Prisma engine/runtime files
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility libraries
├── public/               # Static assets
├── Dockerfile           # Docker configuration
└── package.json         # Dependencies and scripts
```

### Key Technologies

- **Framework**: Next.js 15 (App Router)
- **UI Library**: React 19
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI, shadcn/ui
- **State Management**: React Context API
- **HTTP Client**: Axios
- **Streaming**: @microsoft/fetch-event-source
- **Editor**: ProseMirror
- **Animations**: Framer Motion

## 🐛 Troubleshooting

### Configuration Issues

**Problem**: Configuration Validation Failed
- ✅ Check that all environment variables are set correctly
- ✅ Verify your API credentials are valid
- ✅ If authentication is disabled, ensure Ejento Access Token is set and not expired
- ✅ Ensure the API endpoint is accessible from your server
- ✅ Restart the server after updating environment variables
- ✅ For manual mode: Check Configuration table in database

**Problem**: Configuration Required
- ✅ If using env-driven mode: Ensure `NEXT_PUBLIC_ENV_DRIVEN=true` and all `EJENTO_*` vars are set
- ✅ If using manual mode: Navigate to `/settings` and configure the application
- ✅ Check browser console for additional error messages
- ✅ Verify database can store configuration records when `NEXT_PUBLIC_ENV_DRIVEN=false`

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
- ✅ Check database tables in Prisma Studio to verify messages are being saved(Public Agent Mode)
- ✅ Verify API endpoints for chat history are accessible
- ✅ Check for errors in browser console

## 📝 License

MIT License

## 🤝 Contributing

This is a template repository. Feel free to:
- Fork and customize for your needs
- Report issues or suggest improvements
- Share your customizations with the community

## 📚 Additional Resources

- [Ejento AI Documentation](https://docshub.ejento.ai/)
- [Ejento AI API Documentation](https://api.ejento.ai/)
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Radix UI Documentation](https://www.radix-ui.com)

## 🆘 Support

For issues related to:
- **Template/Code**: Open an issue in this repository
- **Ejento AI APIs**: Contact your Ejento AI provider via `developer.support@ejento.ai`
- **File Upload/Attachment Features**: Check browser and API compatibility
- **Deployment**: Refer to your hosting platform's documentation
- **Prisma ORM**: Check [Prisma's documentation](https://www.prisma.io/docs) 

---

**Built with ❤️ using Next.js and React**
