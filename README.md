<div align="center">
<img width="1200" height="475" alt="Multi-Agent Conversation Generator" src="https://github.com/user-attachments/assets/b57e375f-1919-4448-8861-ba01a64b6b65" />
</div>

# Multi-Agent Conversation Generator

An interactive React application that simulates realistic conversations between multiple AI agents on various topics. Users can participate in discussions, configure agent personalities, and export conversation transcripts as professional reports.

## 🚀 Features

- **Multiple Conversation Scenarios**: Choose from pre-configured scenarios including:
  - 💻 Software Development discussions
  - 📢 Marketing campaign planning
  - 📚 Biography writing collaboration
  - 🎉 Party planning coordination
  - 🗡️ D&D campaign creation

- **Interactive Multi-Agent System**: 
  - AI agents with distinct personalities and expertise
  - Smart conversation moderation that selects the most relevant speakers
  - Dynamic scoring system for agent relevance and context awareness
  - Fair turn distribution to ensure all agents participate

- **User Participation**: Join conversations as yourself and interact with AI agents in real-time

- **Professional Export**: Generate and download conversation reports as:
  - HTML documents with professional formatting
  - PDF files for easy sharing

- **Customizable Agents**: Configure agent names, roles, and starting contexts to fit your specific needs

## 🛠️ Prerequisites

### For Local Development
- **Node.js** (version 16 or higher)
- **OpenAI API Key** - Get yours at [OpenAI Platform](https://platform.openai.com/account/api-keys)

### For Cloud Deployment (Choose One)
- **Option A: Cloudflare Workers + AI Workers** (Recommended)
  - Cloudflare account
  - Wrangler CLI (`npm install -g wrangler`)
  - **No OpenAI API key needed** - uses Cloudflare's built-in AI models

- **Option B: Cloudflare Pages + Functions**
  - Cloudflare account
  - OpenAI API key for backend processing

## ⚡ Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/kedster/Multi-Agent-Conversation-Generator.git
   cd Multi-Agent-Conversation-Generator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up your API key**
   ```bash
   cp .env.local.example .env.local
   ```
   Then edit `.env.local` and add your OpenAI API key:
   ```
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173` to start using the application

## 📖 How to Use

1. **Select a Scenario**: Choose from the available conversation themes on the home screen
2. **Configure Agents**: Customize agent personalities, roles, and starting contexts
3. **Set Your Name**: Enter how you'd like to be addressed in the conversation
4. **Start the Simulation**: Begin the conversation and interact with the AI agents
5. **Export Results**: Generate professional reports of your conversation in HTML or PDF format

## 🏗️ Development

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## 🚀 Deployment

This application supports multiple deployment approaches:

### Option A: Cloudflare Workers + AI Workers (Recommended)

**No OpenAI API key required!** Uses Cloudflare's built-in AI models.

**Quick Deploy:**
```bash
npm run deploy:worker
```

**Features:**
- 🤖 Built-in AI models (no external API keys needed)
- 💰 Cost-effective for high usage
- ⚡ Fast global deployment
- 🔧 Automatic AI model management

For detailed instructions, see [CLOUDFLARE_WORKERS_AI.md](./CLOUDFLARE_WORKERS_AI.md).

### Option B: Cloudflare Pages + Functions

Uses OpenAI API through secure Cloudflare Functions proxy.

**Quick Deploy:**
```bash
npm run deploy:cloudflare
```

For detailed deployment instructions, see [CLOUDFLARE_DEPLOYMENT.md](./CLOUDFLARE_DEPLOYMENT.md).

**Key Features:**
- 🔒 Secure API key handling via Cloudflare Workers
- 🌍 Global CDN for fast loading
- 📊 Built-in analytics and monitoring
- 💰 Generous free tier
- 🔄 Automatic deployments from GitHub

### Other Deployment Options

The application can also be deployed to:
- **Vercel**: Set `VITE_OPENAI_API_KEY` in environment variables
- **Netlify**: Add build command `npm run build` and publish directory `dist`
- **Static Hosting**: Any service that can serve static files (S3, GitHub Pages, etc.)

⚠️ **Security Note**: When deploying to static hosting, your OpenAI API key will be exposed in the browser. Use Cloudflare Pages or similar serverless platforms for production deployments.

## 🎯 Use Cases

- **Team Planning**: Simulate team discussions for project planning and decision-making
- **Creative Writing**: Generate dialogue and character interactions for stories
- **Training Scenarios**: Practice handling different perspectives and viewpoints
- **Brainstorming**: Explore ideas from multiple expert angles
- **Educational Simulations**: Learn about different professional roles and their concerns

## 🔧 Technology Stack

- **Frontend**: React 19 with TypeScript
- **Styling**: Tailwind CSS
- **AI Integration**: OpenAI GPT-4o-mini API
- **Build Tool**: Vite
- **Deployment**: Cloudflare Pages + Workers
- **API Security**: Cloudflare Functions (serverless proxy)
- **Export Features**: jsPDF and html2canvas for document generation

## 📄 License

This project is available under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
