# MessageBox Demo — Store & Forward Visualization

A visual React demo showing how a **MessageBox server** acts as a **store-and-forward** system. Messages are sent through the server, temporarily stored, then delivered to recipients — illustrated by an animated mailman running between people and a post office.

## Prerequisites

- A running **MetaNet Client** (for wallet authentication)
- A local **message-box-server** running on `http://localhost:8080`

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:5174](http://localhost:5174) in your browser.

## How It Works

1. **Connect** — The app uses `@bsv/message-box-client` to authenticate with your local message-box-server via `WalletClient`
2. **Send** — Type a message and watch the mailman pick it up and run to the post office (MessageBox server)
3. **Store** — The message is temporarily held at the post office (store phase)
4. **Forward** — The mailman delivers the message from the post office to the recipient

The visualization shows the complete lifecycle of a message through the store-and-forward system.

## Tech Stack

- **React 18** + **TypeScript** + **Vite**
- **@bsv/message-box-client** — MessageBox client with WebSocket + HTTP support
- **@bsv/sdk** — BSV wallet authentication
- **SVG animations** — Mailman, post office, and participant avatars
- **CSS animations** — Running legs, floating letters, cloud drifts

## Configuration

Edit `src/App.tsx` to change:

```typescript
const MESSAGE_BOX_HOST = 'http://localhost:8080'  // Your server URL
const MESSAGE_BOX_NAME = 'demo_chat'               // MessageBox name
const POLL_INTERVAL = 3000                          // Polling interval (ms)
```
