# Laythquidation

**A Route Generation Tool for Wholesale Business**

---

## Project Overview
Laythquidation is an automated route-generation solution designed for wholesale businesses. It uses Google Maps, Routes, and Geocoding APIs to compute optimized delivery routes based on vendor and destination data. This tool was made specifically for Layth's business.

---

## Key Features
- **Automated Routing**: Leverages Google Maps, Routes, and Geocoding APIs for batching and distance calculations.
- **AI-Enhanced Optimization**: Integrates OpenAI to refine and prioritize route sequences.
- **Instant Notifications**: Sends route details via Telegram for seamless driver communication.
- **Cron Scheduling**: Optional periodic sync job to keep data fresh.
- **Heroku Deployment**: Deployed on Heroku and accessible at https://laythquidation.com

---

## Tech Stack
- **Frontend**: Angular
- **Backend**: Node.js, Express
- **Database**: PostgreSQL
- **APIs**:
  - Google Maps, Routes & Geocoding
  - OpenAI
  - Telegram Bot

---

## Prerequisites
- Node.js v14+ and npm
- PostgreSQL database
- Google Cloud project with Maps, Routes & Geocoding APIs
- Telegram Bot token
- OpenAI API key

---

## Installation & Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/yourorg/laythquidation.git
   cd laythquidation/server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the `server` directory with:
   ```env
   PORT=5001
   DATABASE_URL=postgres://<user>:<pass>@<host>:<port>/<db>
   GOOGLE_MAPS_API_KEY=<your_google_maps_api_key>
   TELEGRAM_BOT_TOKEN=<your_telegram_bot_token>
   OPENAI_API_KEY=<your_openai_api_key>
   ```

4. Run the server:
   ```bash
   node index.js
   ```

---

## Usage
Access the application at: https://laythquidation.com

---

## License
MIT © Sibisai 2024
