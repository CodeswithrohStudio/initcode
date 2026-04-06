# InitCode

![InitCode](public/initcode-logo.png)

**Browser-based IDE for CosmWasm smart contract development on the Initia blockchain.**

🔗 **Live:** [https://initcode-eta.vercel.app](https://initcode-eta.vercel.app)

---

## What it does

InitCode lets you write, edit, and deploy CosmWasm smart contracts directly from the browser — no local toolchain required. It ships with:

- **Monaco editor** (VS Code engine) with syntax highlighting, bracket matching, and multi-tab support
- **AI inline completions** — ghost-text suggestions as you type, accepted with Tab
- **AI chat assistant** — custom-trained model that understands CosmWasm and Initia patterns
- **One-click deploy** — compiles and deploys your contract to Initia Testnet via a server-side deployer wallet
- **File explorer** — create, rename, and delete files; full project tree

---

## Setup

### 1. Clone & install

```bash
git clone https://github.com/CodeswithrohStudio/initcode.git
cd initcode
npm install
```

### 2. Environment variables

Create a `.env.local` file:

```env
# AI (Gemma 4 via Google AI Studio)
GEMINI_API_KEY=your_key_here

# Deployer wallet (Initia testnet)
DEPLOYER_MNEMONIC="your twelve word mnemonic phrase here"

# Chain config
WASM_REST_URL=https://rest.testnet.initia.xyz
WASM_CHAIN_ID=initiation-2
WASM_GAS_DENOM=uinit
```

### 3. Run

```bash
npm run dev --turbo=false
```

Open [http://localhost:3000](http://localhost:3000).

---

## Tech stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router) |
| Editor | Monaco Editor (`@monaco-editor/react`) |
| AI | Gemma 4 via Google Generative AI SDK |
| State | Zustand |
| Styling | Tailwind CSS |
| Deploy target | Initia Testnet (CosmWasm) |
