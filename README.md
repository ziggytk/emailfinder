# Gmail Email Finder

A simple, modern React application that connects to your Gmail account and displays your top 50 emails with a clean interface.

## Features

- 🔐 **Secure Google OAuth Login** - Uses Google's official OAuth 2.0 flow
- 📧 **Real Gmail Integration** - Connects directly to Gmail API
- 🎨 **Modern UI** - Clean, responsive design with Tailwind CSS
- 🔍 **Search Functionality** - Search emails by sender, subject, or content
- 📱 **Mobile Responsive** - Works great on all devices
- ⚡ **Fast Loading** - Optimized for performance

## Quick Start

### 1. Clone the repository
```bash
git clone <repository-url>
cd emailfinder
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Gmail API
   - People API
4. Create OAuth 2.0 credentials:
   - Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Add your domain to "Authorized JavaScript origins" (e.g., `http://localhost:5173` for development)
   - Copy the Client ID

### 4. Create environment file
Create a `.env` file in the root directory:
```env
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
```

### 5. Start the development server
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## How it Works

1. **Authentication**: Uses Google's OAuth 2.0 flow for secure authentication
2. **Email Fetching**: Connects to Gmail API to fetch your top 50 emails
3. **Data Processing**: Parses email headers and content for display
4. **Search**: Provides client-side search across email content

## Project Structure

```
src/
├── components/          # React components
│   ├── EmailDashboard.tsx  # Main dashboard
│   ├── EmailList.tsx       # Email list display
│   ├── Header.tsx          # App header
│   ├── LoginScreen.tsx     # Login interface
│   └── SearchBar.tsx       # Search functionality
├── services/
│   └── gmailApi.ts         # Gmail API integration
├── types/
│   └── email.ts            # TypeScript type definitions
└── App.tsx                 # Main application component
```

## Technologies Used

- **React 18** - Modern React with hooks
- **TypeScript** - Type safety
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icons
- **Gmail API** - Official Google Gmail API
- **Google OAuth 2.0** - Secure authentication

## Security

- Uses Google's official OAuth 2.0 flow
- No server-side storage of credentials
- Access tokens are stored locally and can be revoked
- Follows Google's security best practices

## Troubleshooting

### Common Issues

1. **"Failed to load Google API"**
   - Make sure your Google Client ID is correct
   - Check that your domain is added to authorized origins

2. **"Authentication Error"**
   - Clear browser cache and try again
   - Check that Gmail API and People API are enabled

3. **"No emails found"**
   - Ensure you have emails in your Gmail inbox
   - Check that the Gmail API has proper permissions

### Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

## License

MIT License - feel free to use this project for your own purposes.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

**Note**: This application requires a Google account with Gmail access. Make sure you have the necessary permissions to access the Gmail API. 