# Quick-start Ejento AI Template

A flexible Next.js template for building AI-powered chat applications with the Ejento AI platform. This template provides a complete chat interface with streaming responses, message history, flexible configuration options and authentication flow. Users are encouraged to build up on this template to utilize Ejento AI's capabilities by taking advantage of [Ejento AI APIs](https://api.ejento.ai/).
The [Quick-start Template for Building an App Guide](https://api.ejento.ai/guide/quick-start-template-for-building-an-app) will walk you through the steps required to get started.

## 🚀 Features

### Core Functionality
- **Message History**: Persistent chat threads organized by date (today, yesterday, last week, etc.)
- **Streaming Responses**: Real-time streaming of AI responses with typewriter effect
- **Thread Management**: Create, navigate, and organize multiple chat conversations
- **Public Agent Mode**: Support for public-facing AI agents with session management


### Developer Experience
- **TypeScript**: Fully typed codebase for better development experience
- **Modern Stack**: Next.js 15, React 19, Tailwind CSS
- **Component Library**: Built with Radix UI and shadcn/ui components
- **Flexible Configuration**: Environment-driven and manual configuration modes
- **Secure Authentication Flow**: Supports authentication flow

## 📋 Requirements

### System Requirements
- **Node.js**: Version 20 or higher
- **npm**: Version 7 or higher (or yarn/pnpm/bun)
- **Modern Browser**: Chrome, Firefox, Safari, or Edge (latest versions)

### API Requirements

- Refer to the [documentation](https://docshub.ejento.ai/tutorials/apikeys) to retrieve your Base URL, API Key, Agent ID, and Access Token (only if authentication is disabled) from Ejento AI.
- **Ejento API Access**: Valid Ejento API credentials are required. The credentials required depend on whether authentication is enabled or disabled:
  ## 1. Authentication Enabled
  - The Access Token will be issued automatically after successful user authentication.
  - During configuration, the user only needs:
    - Base URL for your Ejento API instance
    - API Key (Ocp-Apim-Subscription-Key)
    - Agent ID
  ## 2. Authentication Disabled
  - The user must provide all credentials during configuration:
    - Base URL for your Ejento API instance
    - API Key (Ocp-Apim-Subscription-Key)
    - Ejento Access Token
    - Agent ID

   - For retreiving Ejento Access Token before its expiration (7 days), refer the Guide [here](https://api.ejento.ai/getting-started-with-authentication).

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

The application supports two configuration modes. Choose the one that best fits your use case:

#### Option A: Environment-Driven Configuration 

1. Create a `.env` file in the root directory:

```bash
# Copy from example (if available) or create new
touch .env
```

2. Add the following environment variables:

```env
NODE_ENV=production

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
2. Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. If authentication is enabled, you will be redirected to the /auth/login page after successful validation; otherwise, you will be redirected to the /chat page.

#### Option B: Manual Configuration 

This mode allows users to configure credentials through the UI, stored in browser. Ideal for plug and play scenario.

1. Create a `.env` file in the root directory:

```bash
# Copy from example (if available) or create new
touch .env
```

2. Add the following environment variables:

```env
NODE_ENV=production

# Disable environment-driven configuration
NEXT_PUBLIC_ENV_DRIVEN=false

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

2. Start the development server:

```bash
npm run dev
```

3. Navigate to the Settings page at `http://localhost:3000/settings`

4. Enter your API configuration:
   - **Base URL**: Your Ejento API base URL
   - **Ejento Access Token**: Bearer your-authentication-token (if authentication is disabled; otherwise, it is provided automatically after login)
   - **API Key**: Ocp-Apim-Subscription-Key
   - **Agent ID**: Your agent identifier

The configuration will be saved to browser localStorage and validated automatically.

**Note**: To use manual configuration, don't forget to
- Set `NEXT_PUBLIC_ENV_DRIVEN=false` and `NEXT_PUBLIC_AGENT=false` in your `.env`

### 4. Enable Authentication Flow

The application provides the option to enable the authentication flow.

   ## Steps to Enable Authentication Flow

   - Set `NEXT_PUBLIC_AUTH_FLOW` to `true`
   - Set `NEXT_PUBLIC_APP_URL` (e.g., `http://localhost:3000` for development, `https://yourapp.com` for production)
   - The access token will be provided automatically after successful login

## ⚙️ Environment Variables Reference

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
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

### Configuration Flow

1. **Initial Load**: The application checks for configuration in this order:
   - Environment variables (if `NEXT_PUBLIC_ENV_DRIVEN=true`)
   - Browser localStorage (manual configuration)
   - Redirects to settings if no configuration found

2. **Validation**: All configurations are automatically validated:
   - Credential validation (requires API key and access token if auth is disabled, otherwise only API key.)
   - Agent validation (confirms agent exists and is accessible)
   - User data fetching (automatically retrieves user information)

3. **Routing**:
   - **Valid Configuration**: Automatically routes to `/auth/login` if authentication is enabled; otherwise, redirects to `/chat`
   - **Invalid/Missing Configuration**: Routes to `/settings` or shows error message
   - **Environment-Driven Mode**: Settings page is disabled


### Chat Features

- **Streaming Responses**: Real-time streaming of AI responses
- **Message History**: Persistent chat threads with date-based organization
- **Message Actions**: Upvote, downvote, regenerate and provide feedback to responses
- **Thread Management**: Create new chats, navigate between threads

## 🎨 Use Cases

### 1. AI Assistant
Deploy as an internal AI assistant for your organization:
- Use environment-driven configuration for security
- Enable authentication 
- Customize UI to match your brand

### 2. Public AI Agent
Create a public-facing AI agent:
- Enable `NEXT_PUBLIC_AGENT=true` and set `NEXT_PUBLIC_ENV_DRIVEN=true` for public agent mode
- Same Agent exposed to multiple users. Browser based session management for anonymous access. 
- **Note**: The Author's credentials will be utilized for authentication and interaction with Ejento AI, however users will only be able to see the chats of their own browser session

### 3. Development/Testing Environment
Use for local development and testing:
- Manual configuration mode for flexibility
- Easy switching between different Agents when `NEXT_PUBLIC_ENV_DRIVEN=false` and `NEXT_PUBLIC_AGENT=false`
- Full access to settings page

### 4. White-Label Solution
Customize for clients:
- Environment-driven configuration per deployment
- Custom branding and styling
- Isolated credential management


### Project Structure

```
ejento_template/
├── src/
│   ├── app/              # Next.js app router pages
│   │   ├── api/          # API routes (proxy, config, sso)
│   │   ├── auth/         # authentication-related pages
│   │   ├── chat/         # Chat page
│   │   ├── settings/     # Settings page
│   │   └── context/      # React contexts
│   ├── components/       # React components
│   │   ├─ authentication # authentication-related components
│   │   ├─ chat/         # Chat-related components
│   │   └── ui/           # UI component library
│   ├── hooks/             # Custom React hooks
│   ├── lib/              # Utility libraries
│   ├── middleware/       # Next.js middleware
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

**Problem**: "Configuration Validation Failed"
- ✅ Check that all environment variables are set correctly
- ✅ Verify your API credentials are valid
- ✅ If authentication is disabled, ensure Ejento Access Token is set and not expired (expires every 7 days). Refer to this [Guide](https://api.ejento.ai/getting-started-with-authentication) to generate a new one
- ✅ If authentication is enabled, ensure the login flow works correctly and the user is able to obtain the access token automatically
- ✅ Ensure the API endpoint is accessible from your server
- ✅ Check server logs for detailed error messages
- ✅ Restart the server after updating environment variables


**Problem**: "Configuration Required"
- ✅ If using env-driven mode: Ensure `NEXT_PUBLIC_ENV_DRIVEN=true` and all `EJENTO_*` vars are set
- ✅ If using manual mode: Navigate to `/settings` and configure the application
- ✅ Check browser console for additional error messages

### Build Issues

**Problem**: Build fails with dependency errors
- ✅ Use `npm install --legacy-peer-deps` 
- ✅ Clear `node_modules` and `package-lock.json`, then reinstall
- ✅ Ensure Node.js version is 20 or higher

**Problem**: TypeScript errors
- ✅ Run `npm run type-check` to see detailed type errors
- ✅ Ensure all environment variables are properly typed

### Runtime Issues

**Problem**: Chat not loading or streaming not working
- ✅ Check browser console for errors
- ✅ Verify API credentials are valid and not expired
- ✅ Check network tab to see if API calls are successful
- ✅ Ensure `NEXT_PUBLIC_STREAM_CHAT=true` if using streaming

**Problem**: Messages not persisting
- ✅ In case of `NEXT_PUBLIC_AGENT=true` check IndexedDB is properly initialized in browser DevTools
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
- **Deployment**: Refer to your hosting platform's documentation

---

**Built with ❤️ using Next.js and React**
