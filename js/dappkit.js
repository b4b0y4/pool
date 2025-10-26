import { ethers } from "./libs/ethers.min.js";

// START networkConfigs.js
export const networkConfigs = {
  ethereum: {
    name: "Ethereum",
    rpcUrl: "https://ethereum-rpc.publicnode.com",
    chainId: 1,
    chainIdHex: "0x1",
    icon: "./assets/img/eth.png",
    explorerUrl: "https://etherscan.io/tx/",
    showInUI: true,
  },
  arbitrum: {
    name: "Arbitrum",
    rpcUrl: "https://1rpc.io/arb",
    chainId: 42161,
    chainIdHex: "0xa4b1",
    icon: "./assets/img/arb.png",
    explorerUrl: "https://arbiscan.io/tx/",
    showInUI: true,
  },
  optimism: {
    name: "Optimism",
    rpcUrl: "https://mainnet.optimism.io",
    chainId: 10,
    chainIdHex: "0xa",
    icon: "./assets/img/op.png",
    explorerUrl: "https://optimistic.etherscan.io/tx/",
    showInUI: true,
  },
  base: {
    name: "Base",
    rpcUrl: "https://base-rpc.publicnode.com",
    chainId: 8453,
    chainIdHex: "0x2105",
    icon: "./assets/img/base.png",
    explorerUrl: "https://basescan.org/tx/",
    showInUI: true,
  },
  zksync: {
    name: "ZKsync",
    rpcUrl: "https://mainnet.era.zksync.io",
    chainId: 324,
    chainIdHex: "0x144",
    icon: "./assets/img/zksync.png",
    explorerUrl: "https://explorer.zksync.io/tx/",
    showInUI: false,
  },
  scroll: {
    name: "Scroll",
    rpcUrl: "https://rpc.scroll.io",
    chainId: 534352,
    chainIdHex: "0x82750",
    icon: "./assets/img/scroll.png",
    explorerUrl: "https://scrollscan.com/tx/",
    showInUI: false,
  },
  sepolia: {
    name: "Sepolia",
    rpcUrl: "https://rpc.sepolia.org",
    chainId: 11155111,
    chainIdHex: "0xaa36a7",
    icon: "./assets/img/sepolia.png",
    explorerUrl: "https://sepolia.etherscan.io/tx/",
    showInUI: false,
  },
};
// END networkConfigs.js

// START rpcModal.js
const rpcModal = document.getElementById("rpc-modal");
const settingsBtn = document.getElementById("settings-btn");
const rpcCloseBtn = document.getElementsByClassName("rpc-close-btn")[0];
const rpcInputs = document.getElementById("rpc-inputs");
const saveRpcBtn = document.getElementById("save-rpc-btn");

function toggleModal(show) {
  rpcModal.classList.toggle("show", show);
  settingsBtn.classList.toggle("active", show);
}

settingsBtn.onclick = () => {
  populateRpcInputs();
  toggleModal(true);
};

rpcCloseBtn.onclick = () => toggleModal(false);

window.onclick = (e) => {
  if (e.target === rpcModal) toggleModal(false);
};

function populateRpcInputs() {
  rpcInputs.innerHTML = "";
  for (const network in networkConfigs) {
    if (networkConfigs[network].showInUI) {
      const div = document.createElement("div");
      const label = document.createElement("label");
      label.innerText = networkConfigs[network].name;
      const input = document.createElement("input");
      input.id = `${network}-rpc`;
      input.placeholder = "Enter custom RPC URL";
      const customRpc = localStorage.getItem(`${network}-rpc`);
      if (customRpc) {
        input.value = customRpc;
      }
      div.appendChild(label);
      div.appendChild(input);
      rpcInputs.appendChild(div);
    }
  }
}

saveRpcBtn.onclick = function () {
  for (const network in networkConfigs) {
    if (networkConfigs[network].showInUI) {
      const input = document.getElementById(`${network}-rpc`);
      if (input.value) {
        localStorage.setItem(`${network}-rpc`, input.value);
      } else {
        localStorage.removeItem(`${network}-rpc`);
      }
    }
  }
  toggleModal(false);
};

export function getRpcUrl(network) {
  const customRpc = localStorage.getItem(`${network}-rpc`);
  return customRpc || networkConfigs[network].rpcUrl;
}
// END rpcModal.js

// START copy.js
class Copy {
  static initialized = false;
  static elements = new WeakSet();
  static icon = `<svg class="copy-icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
  static successIcon = '<polyline points="20 6 9 17 4 12"/>';
  static errorIcon =
    '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>';

  static init() {
    if (this.initialized) return;
    this.initialized = true;

    document.addEventListener("click", this.handleClick.bind(this), true);

    this.observer = new MutationObserver(this.handleMutations.bind(this));
    this.observer.observe(document.body, { childList: true, subtree: true });

    document.querySelectorAll("[data-copy]").forEach((el) => this.enhance(el));
  }

  static handleClick(e) {
    const el = e.target.closest("[data-copy]");
    if (!el) return;

    e.preventDefault();
    e.stopPropagation();

    const text = el.getAttribute("data-copy");
    this.copy(text, el);
  }

  static handleMutations(mutations) {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== 1) continue;

        if (node.matches?.("[data-copy]")) {
          this.enhance(node);
        }
        node
          .querySelectorAll?.("[data-copy]")
          ?.forEach((el) => this.enhance(el));
      }
    }
  }

  static enhance(el) {
    if (this.elements.has(el)) return;

    el.title ||= "Click to copy";

    if (!el.querySelector(".copy-icon-svg")) {
      el.insertAdjacentHTML("beforeend", this.icon);
    }

    this.elements.add(el);
  }

  static async copy(text, el) {
    try {
      await navigator.clipboard.writeText(text);
      this.feedback(el, true);
      return true;
    } catch (err) {
      console.warn("Copy failed:", err);
      this.feedback(el, false);
      return false;
    }
  }

  static feedback(el, success) {
    if (!el) return;

    const svg = el.querySelector("svg");
    if (!svg) return;

    const prevInner = svg.innerHTML;
    const prevTitle = el.title;

    svg.innerHTML = success ? this.successIcon : this.errorIcon;
    el.title = success ? "Copied!" : "Copy failed";
    el.classList.add(success ? "copy-success" : "copy-error");

    setTimeout(() => {
      svg.innerHTML = prevInner;
      el.title = prevTitle || "Click to copy";
      el.classList.remove("copy-success", "copy-error");
    }, 2000);
  }

  static destroy() {
    this.observer?.disconnect();
    this.initialized = false;
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => Copy.init());
} else {
  Copy.init();
}
// END copy.js

// START notifications.js
export class Notification {
  static container = null;
  static notifications = new Map();
  static transactions = new Map();
  static idCounter = 0;
  static initialized = false;
  static rpcProviders = new Map();

  static init() {
    if (this.initialized) return;

    this.container = document.getElementById("notificationContainer");

    if (!this.container) {
      this.container = document.createElement("div");
      this.container.id = "notificationContainer";
      document.body.appendChild(this.container);
    }

    this.initialized = true;
  }

  static show(message, type = "info", options = {}) {
    this.init();

    const config = {
      duration: 5000,
      closable: true,
      showProgress: true,
      html: false,
      ...options,
    };

    const id = ++this.idCounter;
    const notification = this.createNotification(id, message, type, config);

    this.notifications.set(id, {
      element: notification,
      config,
      timeoutId: null,
    });

    this.container.appendChild(notification);

    requestAnimationFrame(() => {
      notification.classList.add("show");
    });

    if (config.duration > 0) {
      this.scheduleHide(id, config.duration);
    }

    return id;
  }

  static createNotification(id, message, type, config) {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.setAttribute("data-id", id);

    const safeMessage = config.html ? message : this.escapeHtml(message);

    notification.innerHTML = `
      <div class="notif-content">
        <div class="notif-message">
          <span>${safeMessage}</span>
        </div>
        ${config.closable ? `<button class="notif-close">&times;</button>` : ""}
        ${config.showProgress && config.duration > 0 ? `<div class="progress-bar" style="animation-duration: ${config.duration}ms"></div>` : ""}
      </div>
    `;

    if (config.closable) {
      notification
        .querySelector(".notif-close")
        .addEventListener("click", () => this.hide(id));
    }

    return notification;
  }

  static track(txHash, chainId, rpcUrl, options = {}) {
    this.init();

    const config = {
      label: "Transaction",
      onPending: null,
      onSuccess: null,
      onError: null,
      autoRemove: true,
      removeDelay: 5000,
      ...options,
    };

    const id = txHash;

    if (this.transactions.has(id)) {
      return id;
    }

    const txElement = this.createTransaction(id, txHash, chainId, config);
    this.container.appendChild(txElement);

    this.transactions.set(id, {
      element: txElement,
      config,
      status: "pending",
    });

    requestAnimationFrame(() => {
      txElement.classList.add("show");
    });

    this.watchTransaction(id, txHash, chainId, rpcUrl, config);

    return id;
  }

  static createTransaction(id, txHash, chainId, config) {
    const tx = document.createElement("div");
    tx.className = "notification tx-notification pending";
    tx.setAttribute("data-id", id);

    const shortHash = `${txHash.substring(0, 6)}...${txHash.substring(txHash.length - 4)}`;
    const explorerUrl = this.getExplorerUrl(txHash, chainId);

    tx.innerHTML = `
      <div class="notif-content">
        <div class="tx-icon">
          <div class="tx-spinner"></div>
        </div>
        <div class="tx-details">
          <div class="tx-label">${this.escapeHtml(config.label)}</div>
          <div class="tx-hash">
            <a href="${explorerUrl}" target="_blank" rel="noopener noreferrer">${shortHash}</a>
          </div>
        </div>
        <div class="tx-status">Pending</div>
        <button class="notif-close">&times;</button>
      </div>
    `;

    tx.querySelector(".notif-close").addEventListener("click", () => {
      this.removeTransaction(id);
    });

    return tx;
  }

  static getExplorerUrl(txHash, chainId) {
    const network = Object.values(networkConfigs).find(
      (net) => net.chainId === chainId,
    );

    if (network?.explorerUrl) {
      return `${network.explorerUrl}${txHash}`;
    }

    return `https://etherscan.io/tx/${txHash}`;
  }

  static getRpcProvider(chainId, rpcUrl) {
    const key = `${chainId}-${rpcUrl}`;
    if (!this.rpcProviders.has(key)) {
      this.rpcProviders.set(key, new ethers.JsonRpcProvider(rpcUrl));
    }
    return this.rpcProviders.get(key);
  }

  static async watchTransaction(id, txHash, chainId, rpcUrl, config) {
    const txData = this.transactions.get(id);
    if (!txData) return;

    try {
      const provider = this.getRpcProvider(chainId, rpcUrl);

      if (config.onPending) {
        config.onPending(txHash);
      }

      const receipt = await provider.waitForTransaction(txHash);

      if (!this.transactions.has(id)) return;

      if (receipt.status === 1) {
        this.updateTransactionStatus(id, "success", "Confirmed");
        if (config.onSuccess) {
          config.onSuccess(receipt);
        }
      } else {
        this.updateTransactionStatus(id, "failed", "Failed");
        if (config.onError) {
          config.onError(new Error("Transaction failed"));
        }
      }

      if (config.autoRemove) {
        setTimeout(() => this.removeTransaction(id), config.removeDelay);
      }
    } catch (error) {
      if (!this.transactions.has(id)) return;

      this.updateTransactionStatus(id, "failed", "Failed");
      if (config.onError) {
        config.onError(error);
      }

      if (config.autoRemove) {
        setTimeout(() => this.removeTransaction(id), config.removeDelay);
      }
    }
  }

  static updateTransactionStatus(id, status, statusText) {
    const txData = this.transactions.get(id);
    if (!txData) return;

    txData.status = status;
    txData.element.classList.remove("pending", "success", "failed");
    txData.element.classList.add(status);

    const statusEl = txData.element.querySelector(".tx-status");
    if (statusEl) {
      statusEl.textContent = statusText;
    }

    const spinner = txData.element.querySelector(".tx-spinner");
    if (spinner && status !== "pending") {
      spinner.remove();
    }
  }

  static removeTransaction(id) {
    const txData = this.transactions.get(id);
    if (!txData) return;

    txData.element.classList.add("hide");

    setTimeout(() => {
      txData.element?.parentNode?.removeChild(txData.element);
      this.transactions.delete(id);
    }, 400);
  }

  static hide(id) {
    const notif = this.notifications.get(id);
    if (!notif) return;

    if (notif.timeoutId) clearTimeout(notif.timeoutId);

    notif.element.classList.add("hide");

    setTimeout(() => {
      notif.element?.parentNode?.removeChild(notif.element);
      this.notifications.delete(id);
    }, 400);
  }

  static scheduleHide(id, delay) {
    const notif = this.notifications.get(id);
    if (notif) {
      notif.timeoutId = setTimeout(() => this.hide(id), delay);
    }
  }

  static clearTransactions() {
    this.transactions.forEach((_, id) => this.removeTransaction(id));
  }

  static clearAll() {
    this.notifications.forEach((_, id) => this.hide(id));
    this.transactions.forEach((_, id) => this.removeTransaction(id));
  }

  static escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}
// END notifications.js

// START connect.js
export class ConnectWallet {
  constructor(options = {}) {
    this.networkConfigs = options.networkConfigs || networkConfigs;
    this.providers = [];
    this.storage = options.storage || window.localStorage;
    this.currentProvider = null;

    // Precompute lookups
    this.chainIdToName = {};
    this.allowedChains = [];
    Object.values(this.networkConfigs).forEach((cfg) => {
      this.chainIdToName[cfg.chainId] = cfg.name;
      if (cfg.showInUI) {
        this.allowedChains.push(cfg.chainId);
      }
    });

    // Auto-discover elements (deferred until DOM is ready)
    this.elements = {};
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.init());
    } else {
      this.init();
    }
  }

  init() {
    this.discoverElements();
    this.bindEvents();
    this.setupUIEvents();
    this.requestProviders();
    this.restoreState();
    this.render();
  }

  discoverElements() {
    this.elements = {
      connectBtn: document.querySelector("#connect-btn"),
      connectModal: document.querySelector("#connect-modal"),
      connectChainList: document.querySelector("#connect-chain-list"),
      connectWalletList: document.querySelector("#connect-wallet-list"),
    };
  }

  normalizeChainId(chainId) {
    if (typeof chainId === "string" && chainId.startsWith("0x")) {
      return parseInt(chainId, 16);
    }
    return Number(chainId);
  }

  isAllowed(chainId) {
    const normalized = this.normalizeChainId(chainId);
    return this.allowedChains.includes(normalized);
  }

  bindEvents() {
    window.addEventListener("eip6963:announceProvider", (event) => {
      this.handleProviderAnnounce(event);
    });
  }

  setupUIEvents() {
    if (this.elements.connectBtn) {
      this.elements.connectBtn.addEventListener("click", (event) => {
        if (event.target.closest("[data-copy]")) return;
        event.stopPropagation();
        this.toggleModal();
      });
    }

    if (this.elements.connectModal) {
      this.elements.connectModal.addEventListener("click", (event) => {
        event.stopPropagation();
      });
    }

    document.addEventListener("click", () => {
      this.hideModal();
    });
  }

  requestProviders() {
    window.dispatchEvent(new Event("eip6963:requestProvider"));
  }

  handleProviderAnnounce(event) {
    const { detail: providerDetail } = event;
    const providerName = providerDetail.info.name;

    if (!this.providers.some((p) => p.info.name === providerName)) {
      this.providers.push(providerDetail);
      this.render();

      if (this.isConnected() && this.getLastWallet() === providerName) {
        this.connectWallet(this.getLastWallet());
      }
    }
  }

  createButton(config, onClick) {
    const button = document.createElement("button");
    button.innerHTML = `<img src="${config.icon}">${config.name}<span class="connect-dot" style="display: none"></span>`;
    button.onclick = onClick;
    return button;
  }

  async connectWallet(name) {
    const provider = this.providers.find((p) => p.info.name === name);
    if (!provider) return;

    try {
      const [accounts, chainId] = await Promise.all([
        provider.provider.request({ method: "eth_requestAccounts" }),
        provider.provider.request({ method: "eth_chainId" }),
      ]);

      this.storage.setItem("connectCurrentChainId", chainId);
      this.storage.setItem("connectLastWallet", name);
      this.storage.setItem("connectConnected", "true");

      this.setupProviderEvents(provider);
      this.updateAddress(accounts[0]);
      this.updateNetworkStatus(chainId);
      this.render();

      if (this.onConnectCallback) {
        this.onConnectCallback({
          accounts,
          chainId,
          provider: provider.info.name,
        });
      }

      return { accounts, chainId, provider: provider.provider };
    } catch (error) {
      console.error("Connection failed:", error);
      throw error;
    }
  }

  setupProviderEvents(provider) {
    if (this.currentProvider === provider.provider) {
      return;
    }

    if (this.currentProvider) {
      this.currentProvider.removeAllListeners?.();
    }

    this.currentProvider = provider.provider;

    provider.provider
      .on("accountsChanged", (accounts) => {
        accounts.length > 0
          ? this.updateAddress(accounts[0])
          : this.disconnect();
      })
      .on("chainChanged", (chainId) => {
        this.updateNetworkStatus(chainId);
        if (this.onChainChangeCallback) {
          const normalized = this.normalizeChainId(chainId);
          const name = this.chainIdToName[normalized] || `Unknown (${chainId})`;
          const allowed = this.isAllowed(chainId);

          this.onChainChangeCallback({
            chainId: normalized,
            hexChainId: chainId,
            name,
            allowed,
          });
        }
        this.render();
      })
      .on("disconnect", () => this.disconnect());
  }

  updateAddress(address) {
    if (this.elements.connectBtn) {
      const short = `${address.substring(0, 5)}...${address.substring(address.length - 4)}`;
      this.elements.connectBtn.innerHTML = `
        <span class="connect-address-text">${short}</span>
        <span class="connect-copy-icon" data-copy="${address}"></span>
      `;
      this.elements.connectBtn.classList.add("connected");
      this.elements.connectBtn.classList.remove("ens-resolved");
      this.elements.connectBtn.setAttribute("data-address", address);
      this.resolveENS(address);
    }
  }

  async resolveENS(address) {
    if (!this.elements.connectBtn) return;

    try {
      const mainnetProvider = new ethers.JsonRpcProvider(getRpcUrl("ethereum"));
      const ensName = await mainnetProvider.lookupAddress(address);
      if (!ensName) return;

      const ensAvatar = await mainnetProvider.getAvatar(ensName);
      const short = `${address.substring(0, 5)}...${address.substring(
        address.length - 4,
      )}`;

      let buttonContent = `
        <div class="ens-details">
          <div class="ens-name">${ensName}</div>
          <div class="ens-address-row">
            <span class="ens-address">${short}</span>
            <span class="connect-copy-icon" data-copy="${address}"></span>
          </div>
        </div>
      `;
      if (ensAvatar) {
        buttonContent += `<img src="${ensAvatar}" style="border-radius: 50%">`;
      }

      this.elements.connectBtn.innerHTML = buttonContent;
      this.elements.connectBtn.classList.add("ens-resolved");
      this.elements.connectBtn.setAttribute("data-address", address);
    } catch (error) {
      console.log("ENS resolution failed:", error);
    }
  }

  async switchNetwork(networkConfig) {
    const provider = this.getConnectedProvider();
    if (!provider) return;

    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: networkConfig.chainIdHex }],
      });
      this.hideModal();
      this.storage.setItem("connectCurrentChainId", networkConfig.chainIdHex);
      this.updateNetworkStatus(networkConfig.chainIdHex);
      this.render();
    } catch (error) {
      console.error("Network switch failed:", error);
      throw error;
    }
  }

  updateNetworkStatus(chainId) {
    const normalized = this.normalizeChainId(chainId);
    const network = Object.values(this.networkConfigs).find(
      (net) => net.chainId === normalized || net.chainIdHex === chainId,
    );

    if (network?.showInUI) {
      this.storage.setItem("connectCurrentChainId", chainId);
    } else {
      this.storage.removeItem("connectCurrentChainId");
    }
  }

  async disconnect() {
    const provider = this.getConnectedProvider();

    try {
      await provider?.request({
        method: "wallet_revokePermissions",
        params: [{ eth_accounts: {} }],
      });
    } catch (error) {
      console.error("Disconnect failed:", error);
    }

    if (this.currentProvider) {
      this.currentProvider.removeAllListeners?.();
      this.currentProvider = null;
    }

    ["connectCurrentChainId", "connectLastWallet", "connectConnected"].forEach(
      (key) => this.storage.removeItem(key),
    );

    if (this.onDisconnectCallback) {
      this.onDisconnectCallback();
    }

    if (this.elements.connectBtn) {
      this.elements.connectBtn.innerHTML = "Connect";
      this.elements.connectBtn.classList.remove("connected", "ens-resolved");
    }

    if (this.elements.connectModal) {
      this.elements.connectModal.classList.remove("show");
    }

    this.updateNetworkStatus(this.networkConfigs.ethereum.chainIdHex);
    this.render();
  }

  toggleModal() {
    if (this.elements.connectModal) {
      this.elements.connectModal.classList.toggle("show");
    }
  }

  hideModal() {
    if (this.elements.connectModal) {
      this.elements.connectModal.classList.remove("show");
    }
  }

  render() {
    this.renderWalletProviders();
    this.renderChainList();
    this.renderGetWallet();
  }

  renderWalletProviders() {
    if (!this.elements.connectWalletList) return;

    this.elements.connectWalletList.innerHTML = "";
    const connectedWallet = this.getLastWallet();

    this.providers.forEach((provider) => {
      const button = this.createButton(provider.info, () => {
        this.hideModal();
        this.connectWallet(provider.info.name);
      });

      const isConnected = provider.info.name === connectedWallet;
      button.querySelector(".connect-dot").style.display = isConnected
        ? "inline-block"
        : "none";

      this.elements.connectWalletList.appendChild(button);
    });
  }

  renderChainList() {
    if (!this.elements.connectChainList) return;

    this.elements.connectChainList.innerHTML = "";
    const currentChainId = this.getCurrentChainId();
    const isConnected = this.isConnected();

    const networksToShow = Object.entries(this.networkConfigs).filter(
      ([, config]) => config.showInUI,
    );

    const isSingleNetwork = networksToShow.length === 1;

    this.elements.connectChainList.classList.toggle(
      "single-network",
      isSingleNetwork,
    );

    networksToShow.forEach(([networkName, networkConfig]) => {
      const button = document.createElement("button");
      button.id = `connect-${networkName}`;
      button.title = networkConfig.name;

      if (isSingleNetwork) {
        button.classList.add("chain-single");
        button.innerHTML = `<img src="${networkConfig.icon}" alt="${networkConfig.name}"><span class="connect-name">${networkConfig.name}</span><span class="connect-dot" style="display: none"></span>`;
      } else {
        button.innerHTML = `<img src="${networkConfig.icon}" alt="${networkConfig.name}">`;
      }

      button.onclick = () => this.switchNetwork(networkConfig);

      const indicator = document.createElement("span");
      indicator.className = isSingleNetwork
        ? "connect-dot"
        : "connect-dot-icon";
      button.appendChild(indicator);

      indicator.style.display =
        isConnected && networkConfig.chainIdHex === currentChainId
          ? "inline-block"
          : "none";

      this.elements.connectChainList.appendChild(button);
    });
  }

  renderGetWallet() {
    const getWalletEl = document.querySelector("#connect-get-wallet");
    if (getWalletEl) {
      getWalletEl.style.display = this.providers.length ? "none" : "block";
    }
  }

  restoreState() {
    const storedChainId =
      this.getCurrentChainId() || this.networkConfigs.ethereum.chainIdHex;
    this.updateNetworkStatus(storedChainId);

    if (this.isConnected()) {
      const provider = this.getConnectedProvider();
      if (provider) {
        const providerDetail = this.providers.find(
          (p) => p.info.name === this.getLastWallet(),
        );
        if (providerDetail) {
          this.setupProviderEvents(providerDetail);
        }
      }
    }
  }

  isConnected() {
    return this.storage.getItem("connectConnected") === "true";
  }

  getCurrentChainId() {
    return this.storage.getItem("connectCurrentChainId");
  }

  getLastWallet() {
    return this.storage.getItem("connectLastWallet");
  }

  getConnectedProvider() {
    const walletName = this.getLastWallet();
    const provider = this.providers.find((p) => p.info.name === walletName);
    return provider?.provider;
  }

  async getAccount() {
    const provider = this.getConnectedProvider();
    if (!provider) return null;

    try {
      const accounts = await provider.request({ method: "eth_accounts" });
      return accounts[0] || null;
    } catch (error) {
      console.error("Failed to get account:", error);
      return null;
    }
  }

  async getChainId() {
    const provider = this.getConnectedProvider();
    if (!provider) return null;

    try {
      const raw = await provider.request({ method: "eth_chainId" });
      return this.normalizeChainId(raw);
    } catch (error) {
      console.error("Failed to get chain ID:", error);
      return null;
    }
  }

  getProvider() {
    return this.getConnectedProvider();
  }

  getEthersProvider() {
    const provider = this.getConnectedProvider();
    return provider ? new ethers.BrowserProvider(provider) : null;
  }

  onConnect(callback) {
    this.onConnectCallback = callback;
  }

  onDisconnect(callback) {
    this.onDisconnectCallback = callback;
  }

  onChainChange(callback) {
    this.onChainChangeCallback = callback;
  }
}
// END connect.js
