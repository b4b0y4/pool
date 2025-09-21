# Theme + Notifications + Wallet Connection Starter

A minimal dependency template for a quick start with a theme switcher, clean notification system, and a connect wallet component. No build tools required—just open `index.html` in your browser.

## Features

- **Theme Switcher**: A reusable theme switcher with single-click to toggle between light and dark modes, and a double-click to reset to the system preference.
- **Notification System**: Modern, non-blocking slide-in notifications (toasts) with duration, a close button, and a progress bar.
- **Connect Wallet Component**: EIP-6963 compatible wallet connection with multi-network support, persistent state, and ENS integration.

## File Structure

The project includes the following files:

```
.
├── .gitignore
├── README.md
├── index.html
├── license
├── assets/
│   ├── css/
│   │   ├── connect.css
│   │   ├── notifications.css
│   │   └── theme.css
│   └── img/
└──js/
   ├── connect.js
   ├── connect-config.js
   ├── main.js
   ├── notifications.js
   ├── theme.js
   └── libs/
       └── ethers.min.js

```

## How to Use

### 1. Basic Setup

1. Open `index.html` in your web browser.
2. Click the sun/moon icon in the top-right to toggle the theme.
3. Use the buttons to trigger different types of notifications.
4. Connect your Web3 wallet using the connect button.

### 2. Theme Switcher

The theme switcher is automatically initialized and provides:
- **Single-click**: Toggle between light and dark mode
- **Double-click**: Reset to system preference
- **Persistence**: Remembers your choice across sessions

```javascript
// The theme switcher works automatically once included
// No additional setup required
```

### 3. Notification System

Display beautiful toast notifications with various types and options:

#### Basic Usage
```javascript
import NotificationSystem from './js/notifications.js';

// Simple notifications
NotificationSystem.show('Operation completed!', 'success');
NotificationSystem.show('Please check your input', 'warning');
NotificationSystem.show('Something went wrong!', 'danger');
NotificationSystem.show('Here is some information', 'info');

// Persistent notification (won't auto-hide)
NotificationSystem.show('Important message', 'info', { duration: 0 });

// Custom duration (7 seconds)
NotificationSystem.show('Custom timing', 'success', { duration: 7000 });

// No close button or progress bar
NotificationSystem.show('Clean message', 'warning', {
  closable: false,
  showProgress: false
});
```

#### Notification Types
- `success` - Green notifications for successful operations
- `warning` - Orange notifications for warnings
- `danger` - Red notifications for errors
- `info` - Blue notifications for information

#### Available Options
| Option | Default | Description |
|--------|---------|-------------|
| `duration` | `5000` | Auto-hide delay in ms (0 = persistent) |
| `closable` | `true` | Show close button |
| `showProgress` | `true` | Show progress bar |
| `html` | `false` | Allow HTML content |

### 4. Connect Wallet Component

Connect to Ethereum wallets with EIP-6963 support and multi-network functionality:

#### HTML Structure
Add this to your HTML where you want the connect widget:

```html
<div class="connect-wrapper">
    <div class="connect-widget">
        <button id="connect-btn" class="connect-btn">Connect</button>
        <div id="connect-wallet-list" class="connect-wallet-list">
            <div class="connect-chain-list" id="connect-chain-list"></div>
            <div id="connect-get-wallet" class="connect-get-wallet">
                <a href="https://ethereum.org/en/wallets/" target="_blank">Get a Wallet!</a>
            </div>
            <div id="connect-wallets" class="connect-wallets"></div>
        </div>
    </div>
</div>
```

#### JavaScript Setup
```javascript
import { ConnectWallet } from "./connect.js";

// Initialize the wallet connect instance
const wallet = new ConnectWallet();

document.addEventListener("DOMContentLoaded", () => {
  const elements = {
    connectBtn: document.querySelector("#connect-btn"),
    connectChainList: document.querySelector("#connect-chain-list"),
    connectWalletList: document.querySelector("#connect-wallet-list"),
    connectWallets: document.querySelector("#connect-wallets"),
  };

  wallet.setElements(elements);

  // Set up event listeners
  elements.connectBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    wallet.toggleWalletList();
  });

  elements.connectWalletList.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  // Close wallet list when clicking outside
  document.addEventListener("click", () => {
    wallet.hideWalletList();
  });

  // Set up callbacks for connection events
  walletConnect.onConnect((data) => {
    console.log("Connected:", data);
  });

  walletConnect.onDisconnect(() => {
    console.log("Disconnected");
  });

  walletConnect.onChainChange((chainId) => {
    console.log("Chain changed to:", chainId);
  });
});

// Export for global access if needed
window.walletConnect = wallet;
```

#### Wallet Features
- **🔗 EIP-6963 Wallet Discovery** - Automatically detects installed wallets
- **🌐 Multi-Network Support** - Easy network switching with visual indicators
- **💾 Persistent State** - Remembers connection across page reloads
- **📦 Minimal Dependencies** - Only requires ethers.js
- **👤 ENS Support** - Resolves ENS names and avatars
- **📱 Responsive Design** - Mobile-friendly UI components

#### Basic Wallet Operations
```javascript
// Send ETH
async function sendETH(toAddress, amount) {
    try {
        if (!wallet.isConnected()) {
            NotificationSystem.show('Please connect your wallet first', 'warning');
            return;
        }

        const provider = wallet.getEthersProvider();
        const signer = await provider.getSigner();

        const tx = await signer.sendTransaction({
            to: toAddress,
            value: ethers.parseEther(amount)
        });

        NotificationSystem.show(`Transaction sent: ${tx.hash}`, 'info');

        const receipt = await tx.wait();
        NotificationSystem.show('Transaction confirmed!', 'success');

        return receipt;
    } catch (error) {
        NotificationSystem.show('Transaction failed: ' + error.message, 'danger');
        throw error;
    }
}

// Get wallet balance
async function getBalance() {
    if (!wallet.isConnected()) return;

    const provider = wallet.getEthersProvider();
    const account = await wallet.getAccount();
    const balance = await provider.getBalance(account);

    return ethers.formatEther(balance);
}
```

## Dependencies

- **ethers.js** - Required for Web3 functionality

## License

This template is licensed under the [MIT License](license).
