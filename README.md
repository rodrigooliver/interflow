# Interflow Frontend

Frontend application for Interflow - A multi-channel customer service and CRM platform.

## Overview

Interflow's frontend provides:
- Real-time chat interface for multiple messaging channels
- Customer management and CRM features
- Service team management
- Visual flow builder for automated responses
- Multi-language support (English, Spanish, Portuguese)
- Dark mode support
- File attachments and media handling

## Technologies

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Supabase
- i18next for internationalization
- Lucide React for icons
- ReactFlow for visual flow builder
- DND Kit for drag and drop
- Stripe for payments

## Prerequisites

- Node.js 18+
- Supabase project
- Stripe account (for payments)

## Environment Variables

Create a `.env` file with:

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# API
VITE_API_URL=your_backend_api_url
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/rodrigooliver/interflow.git
cd interflow
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

## Features

### Multi-Channel Support
- WhatsApp Business API
- WhatsApp WApi
- WhatsApp ZApi
- WhatsApp Evolution API
- Instagram Direct Messages
- Facebook Messenger
- Email (IMAP/SMTP)

### Real-time Chat Interface
- Message delivery status
- Read receipts
- Typing indicators
- File attachments
- Voice messages
- Emoji support
- Message templates

### Customer Management
- Customer profiles
- Contact history
- Notes and tags
- Custom fields
- File attachments

### Team Management
- Role-based access control
- Service teams
- Agent assignments
- Performance metrics

### Visual Flow Builder
- Drag and drop interface
- Conditional logic
- Delay nodes
- Message templates
- Media nodes
- Variables

### CRM Features
- Sales funnels
- Deal tracking
- Customer stages
- Task management
- Notes and activities

### Internationalization
- English
- Spanish
- Portuguese (Brazil)
- RTL support ready
- Easy language switching

### Theme Support
- Light mode
- Dark mode
- System preference detection
- Persistent preference

### File Management
- Image uploads
- Document attachments
- Storage quotas
- File previews
- Drag and drop

## Project Structure

```
src/
├── components/        # Reusable UI components
├── hooks/            # Custom React hooks
├── lib/              # Utility libraries
├── pages/            # Page components
├── services/         # API services
├── store/            # State management
├── types/            # TypeScript types
└── utils/            # Helper functions
```

## Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint
```

### Code Style

The project uses ESLint and TypeScript for code quality. Configuration is in:
- `eslint.config.js`
- `tsconfig.json`

### Styling

Styling is handled through Tailwind CSS. Configuration is in:
- `tailwind.config.js`
- `postcss.config.js`

### Internationalization

Language files are in `public/locales/{lang}/` directory. To add a new language:
1. Create a new directory for the language code
2. Copy and translate JSON files from an existing language
3. Add the language to the available options in `src/i18n.ts`

## Production Deployment

1. Build the application:
```bash
npm run build
```

2. Deploy the `dist` directory to your hosting service.

### Docker Deployment

```bash
# Build the image
docker build -f Dockerfile.frontend -t interflow-frontend .

# Run the container
docker run -p 80:80 interflow-frontend
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.