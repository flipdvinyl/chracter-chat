# Character Chat Application

A web-based character chat application featuring Kumamon from Kumamoto Prefecture.

## Features

- Mobile-first responsive design
- Character selection landing page
- Interactive chat with speech bubbles
- OpenAI API integration with gpt-4.1-mini
- 4 multiple choice options + custom input
- Smooth animations for choice selection
- Keyboard shortcuts (1-4 keys)
- Choice removal animations
- Selected choice preservation and locking

## Setup

1. Clone the repository
2. Copy the environment file and set your OpenAI API key:
   ```bash
   cp .env.example .env
   # Edit .env file and replace 'your_openai_api_key_here' with your actual API key
   ```
3. Or for development, edit `index.html` and replace the API key in the script tag
4. Serve the files using a local web server:
   ```bash
   python3 -m http.server 3000
   ```
5. Open `http://localhost:3000` in your browser

## Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key (get it from https://platform.openai.com/account/api-keys)
- `GOOGLE_API_KEY`: Your Google API key for Gemini image generation
- `SUPERTONE_API_KEY`: Your Supertone API key for TTS (used by Vercel API)
- `GROQ_API_KEY`: Your Groq API key (for future use)
- `NOTION_SECRET`: Your Notion API secret (for future use)
- `NOTION_DATABASE_ID`: Your Notion database ID (for future use)

## API Architecture

- **TTS API**: Uses Vercel-deployed API at `https://quiet-ink-groq.vercel.app/api/tts` to avoid CORS issues
- **Image Generation**: Direct Google Gemini API calls from browser
- **Chat**: Direct OpenAI API calls from browser

## Security Note

- The `.env` file is ignored by git and will not be committed to the repository
- For production deployment, use proper environment variable injection
- Never commit API keys to version control
- TTS API keys are handled server-side through Vercel deployment

## Usage

1. Select a character from the landing page
2. Start chatting with Kumamon
3. Choose from 4 multiple choice responses or use custom input
4. Use keyboard shortcuts (1-4) for quick selection
5. Selected choices are preserved and locked for the conversation history

## Files

- `index.html` - Main HTML structure
- `style.css` - Responsive styling and animations
- `script.js` - Core application logic and API integration
