# Mathy - Toddler Friendly Ballot App

A simple, minimalist decentralized voting application designed with a "toddler-friendly" UI. Built for the **Base** and **Celo** networks.

## Features

*   **Toddler-Friendly UI:** Large buttons, clear icons, and simple interactions.
*   **Multi-Network Support:** Seamlessly works on Base and Celo.
*   **Live Updates:** Real-time fetching of vote counts and winning proposals.
*   **User-Friendly Errors:** Descriptive error messages for blockchain interactions.
*   **Wallet Connection:** Integrated with Reown AppKit (WalletConnect).

## Tech Stack

*   **Frontend:** React + TypeScript + Vite
*   **Styling:** Tailwind CSS
*   **Web3:** Wagmi, Viem, @reown/appkit

## Getting Started

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Run the development server:**
    ```bash
    npm run dev
    ```

3.  **Build for production:**
    ```bash
    npm run build
    ```

## Contract

Interacts with the Ballot contract at:
*   `0x299fcfac93184d6a606beb94fd990de2351df38d` (Base)
*   `0xa228e4f56cE070241ea6261De8Bc8f982FD5A1EC` (Celo)
