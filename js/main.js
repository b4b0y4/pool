import NotificationSystem from "./notifications.js";
import { ConnectWallet } from "./connect.js";

const wallet = new ConnectWallet();

document.addEventListener("DOMContentLoaded", () => {
  const elements = {
    connectBtn: document.querySelector("#connect-btn"),
    connectChainList: document.querySelector("#connect-chain-list"),
    connectWalletList: document.querySelector("#connect-wallet-list"),
    connectWallets: document.querySelector("#connect-wallets"),
  };

  wallet.setElements(elements);

  elements.connectBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    wallet.toggleWalletList();
  });

  elements.connectWalletList.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  document.addEventListener("click", () => {
    wallet.hideWalletList();
  });

  wallet.onConnect((data) => {
    const account = data.accounts[0];
    const shortAccount = `${account.slice(0, 6)}...${account.slice(-4)}`;
    const providerName = wallet.getLastWallet();

    NotificationSystem.show(
      `Connected to ${providerName} with account ${shortAccount}`,
      "success",
    );
  });

  wallet.onDisconnect(() => {
    NotificationSystem.show("Wallet disconnected", "warning");
  });

  wallet.onChainChange(({ chainId, name, allowed }) => {
    if (!allowed) {
      NotificationSystem.show(`Chain ${chainId} is not allowed`, "danger");
      return;
    }

    NotificationSystem.show(`Switched to ${name}`, "info");
  });

  // Demo notification buttons
  document.querySelectorAll("button[data-type]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const type = btn.getAttribute("data-type");
      NotificationSystem.show(`This is a ${type} notification.`, type);
    });
  });

  NotificationSystem.show(
    "Welcome! Theme switcher is in the top-right.",
    "success",
  );
});

window.walletConnect = wallet;
