# Agentic AI Support - Shopware Plugin

AI-powered customer support chat widget for Shopware 6.

## Features

- 🤖 AI-powered chat interface
- 🛍️ Product recommendations with images and details
- 📦 Order history and tracking
- 💬 Natural language conversations
- 🎨 Customizable appearance
- 📱 Mobile responsive
- 🌐 Multi-language support (EN/DE)

## Requirements

- Shopware 6.4.0 or higher
- PHP 7.4 or higher
- Active AI Customer Support API endpoint

## Installation

1. Download the plugin zip file
2. Upload to Shopware via Extension Manager
3. Install and activate the plugin
4. Configure the plugin settings

## Configuration

Navigate to **Settings > Extensions > Agentic AI Support** and configure:

### API Configuration
- **Enable Chat Widget**: Turn the chat widget on/off
- **API Endpoint URL**: Your AI chat API endpoint (default: `http://localhost:8000/chat`)
- **Shopware Access Key**: Your Shopware store API access key
- **Chat Title**: Title displayed in the chat header
- **Welcome Message**: Initial greeting message

### Appearance
- **Primary Color**: Main color for the chat widget
- **Widget Position**: Choose between bottom-right or bottom-left

## API Integration

The plugin sends POST requests to your API endpoint with the following payload:

```json
{
  "message": "User's message",
  "swAccessKey": "YOUR_ACCESS_KEY",
  "swContextToken": "CONTEXT_TOKEN",
  "shopUrl": "https://your-shop.com"
}
```

Expected response format:

```json
{
  "message": "AI response",
  "type": "text|product_list|product_detail|order_list",
  "data": { ... },
  "context": {
    "swAccessKey": "YOUR_ACCESS_KEY",
    "swContextToken": "UPDATED_TOKEN",
    "shopUrl": "https://your-shop.com"
  }
}
```

## Response Types

- **text**: Simple text response
- **product_list**: List of products with images, prices, and links
- **product_detail**: Detailed product information
- **order_list**: Customer order history

## Development

### Plugin Structure
```
AgenticAiSupport/
├── composer.json
└── src/
    ├── AgenticAiSupport.php
    └── Resources/
        ├── config/
        │   ├── config.xml
        │   └── services.xml
        ├── views/
        │   └── storefront/
        │       ├── base.html.twig
        │       └── layout/
        │           └── meta.html.twig
        └── app/
            └── storefront/
                ├── src/
                │   ├── main.js
                │   ├── chat-widget/
                │   │   └── chat-widget.js
                │   └── scss/
                │       ├── base.scss
                │       └── _chat-widget.scss
                └── build/
                    └── webpack.config.js
```

### Building Assets

If you make changes to JavaScript or SCSS files, rebuild the assets:

```bash
cd custom/plugins/AgenticAiSupport/src/Resources/app/storefront
npm install
npm run build
```

Then clear the Shopware cache:

```bash
bin/console cache:clear
```

## Support

For issues or questions, please contact support or create an issue in the repository.

## License

MIT License
