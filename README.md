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
2. Set your OpenAI API key as an environment variable:
   ```bash
   export OPENAI_API_KEY="your-api-key-here"
   ```
3. Or edit `script.js` and replace `YOUR_OPENAI_API_KEY_HERE` with your actual API key
4. Serve the files using a local web server:
   ```bash
   python3 -m http.server 8080
   ```
5. Open `http://localhost:8080` in your browser

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
