# Utility Bill Finder

A smart React application that helps you find utility bills in your Gmail account. Connect with your Google account, select your utility providers, and automatically discover PDF bills from the past 6 months.

## Features

- 🔐 **Secure Google OAuth Login** - Uses Google's official OAuth 2.0 flow
- 📧 **Gmail Integration** - Searches your Gmail for utility bill PDFs
- 🏢 **Utility Provider Selection** - Choose from major utility companies
- 🔍 **Smart Domain Matching** - Automatically matches emails by provider domains
- 📊 **Bill Details Extraction** - Extracts amounts, bill numbers, and dates
- 🎨 **Modern UI** - Clean, responsive design with Tailwind CSS
- 📱 **Mobile Responsive** - Works great on all devices
- ⚡ **Rate Limited** - Respects Gmail API limits for reliable operation

## Supported Utility Providers

- **ConEdison** (coned.com, conedison.com)
- **Pacific Gas & Electric** (pge.com, pgecorp.com)
- **Duke Energy** (duke-energy.com, dukeenergy.com)
- **National Grid** (nationalgrid.com, nationalgridus.com)
- **Southern California Edison** (sce.com, scecorp.com)
- **Exelon** (exeloncorp.com, exelon.com)
- **Dominion Energy** (dominionenergy.com, dom.com)
- **NextEra Energy** (nexteraenergy.com, fpl.com)

## How It Works

1. **Sign in** with your Google account
2. **Select utility providers** from the list or search for specific companies
3. **Search your Gmail** for PDF attachments from the past 6 months
4. **View results** with filtering, sorting, and bill details
5. **Export or manage** your utility bills

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

### 6. Build for production
```bash
npm run build
```

## Usage

1. **Login**: Click "Sign in with Google" and authorize the application
2. **Select Providers**: Choose the utility companies you want to search for
3. **Search**: Click "Search for Utility Bills" to scan your Gmail
4. **Review Results**: Browse, filter, and sort your found utility bills
5. **Manage**: Use the search and filter options to find specific bills

## Technical Details

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Google OAuth 2.0 Implicit Flow
- **API**: Gmail API with rate limiting
- **Build Tool**: Vite
- **Icons**: Lucide React

## Rate Limiting

The application includes intelligent rate limiting to respect Gmail API quotas:
- 100ms delay between API requests
- Batch processing of messages (10 at a time)
- Automatic retry on 429 errors
- Sequential processing to avoid overwhelming the API

## Privacy & Security

- All authentication is handled by Google OAuth
- No data is stored on our servers
- Gmail access is read-only
- Rate limiting prevents API abuse
- All processing happens in your browser

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License. 