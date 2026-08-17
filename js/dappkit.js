import { ethers } from "./libs/ethers.min.js";

// ============================================================
// WNS CONTRACT CONFIGURATION
// ============================================================

const WNS_CONTRACT_ADDRESS = "0x0000000000696760E15f265e828DB644A0c242EB";
const WNS_ABI = [
  {
    inputs: [{ internalType: "address", name: "addr", type: "address" }],
    name: "reverseResolve",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "string", name: "name", type: "string" }],
    name: "resolve",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
];

// ============================================================
// GNS (Gwei Name Service) CONTRACT CONFIGURATION
// ============================================================

const GNS_CONTRACT_ADDRESS = "0x9D51D507BC7264d4fE8Ad1cf7Fe191933A0a81d6";
const GNS_ABI = [
  {
    inputs: [{ internalType: "address", name: "addr", type: "address" }],
    name: "reverseResolve",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "string", name: "name", type: "string" }],
    name: "resolve",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
];

// ============================================================
// CONSTANTS & CONFIGURATION
// ============================================================

const STORAGE_KEYS = {
  CHAIN_ID: "connectCurrentChainId",
  LAST_WALLET: "connectLastWallet",
  IS_CONNECTED: "connectConnected",
};
const TIMINGS = {
  NOTIFICATION_DURATION: 5000,
  NOTIFICATION_HIDE_DELAY: 400,
  TRANSACTION_REMOVE_DELAY: 5000,
  COPY_FEEDBACK_DURATION: 2000,
};
const PROVIDER_EVENTS = ["accountsChanged", "chainChanged", "disconnect"];
const CONNECT_STATE_KEYS = Object.values(STORAGE_KEYS);
const ENS_EMPTY_RESULT = { name: null, avatar: null };
const COPY_ICONS = {
  copy: `<svg class="copy-icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  success: '<polyline points="20 6 9 17 4 12"/>',
  error:
    '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
};

export const networkConfigs = {
  ethereum: {
    name: "Ethereum",
    rpcUrl: "https://ethereum-rpc.publicnode.com",
    chainId: 1,
    icon: "./assets/img/eth.png",
    explorerUrl: "https://etherscan.io/tx/",
    showInUI: true,
  },
  arbitrum: {
    name: "Arbitrum",
    rpcUrl: "https://1rpc.io/arb",
    chainId: 42161,
    icon: "./assets/img/arb.png",
    explorerUrl: "https://arbiscan.io/tx/",
    showInUI: true,
  },
  optimism: {
    name: "Optimism",
    rpcUrl: "https://mainnet.optimism.io",
    chainId: 10,
    icon: "./assets/img/op.png",
    explorerUrl: "https://optimistic.etherscan.io/tx/",
    showInUI: true,
  },
  base: {
    name: "Base",
    rpcUrl: "https://base-rpc.publicnode.com",
    chainId: 8453,
    icon: "./assets/img/base.png",
    explorerUrl: "https://basescan.org/tx/",
    showInUI: true,
  },
};

// ============================================================
// HELPERS
// ============================================================

const normalizeChainId = (chainId) => {
  if (typeof chainId === "string") chainId = chainId.trim();
  const parsed = Number(chainId);
  return Number.isFinite(parsed) ? parsed : NaN;
};
const chainIdToHex = (chainId) => {
  const n = normalizeChainId(chainId);
  return Number.isFinite(n) ? `0x${n.toString(16)}` : null;
};
const shortenMiddle = (value, s, e) =>
  value
    ? `${value.substring(0, s)}...${value.substring(value.length - e)}`
    : "";
const shortenAddress = (addr, s = 5, e = 4) => shortenMiddle(addr, s, e);
const shortenHash = (hash, s = 6, e = 4) => shortenMiddle(hash, s, e);
const escapeHtml = (text) => {
  const d = document.createElement("div");
  d.textContent = text;
  return d.innerHTML;
};
const getVisibleNetworks = () =>
  Object.entries(networkConfigs).filter(([, c]) => c.showInUI);
const getNetworkByChainId = (chainId) =>
  Object.values(networkConfigs).find(
    (n) => n.chainId === normalizeChainId(chainId),
  );
const hasChainChanged = (prev, next) => {
  const n = normalizeChainId(next);
  return Number.isFinite(n) && n !== normalizeChainId(prev);
};
export const getRpcUrl = (network) =>
  localStorage.getItem(`${network}-rpc`) || networkConfigs[network].rpcUrl;
const getEthereumProvider = () =>
  new ethers.JsonRpcProvider(getRpcUrl("ethereum"));
const removeElementWithDelay = (el, delay, onRemove) => {
  el.classList.add("hide");
  setTimeout(() => {
    el?.parentNode?.removeChild(el);
    onRemove?.();
  }, delay);
};
const onReady = (cb) =>
  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", cb)
    : cb();

// ============================================================
// RPC MODAL
// ============================================================

const rpcModal = document.getElementById("rpc-modal");
const toggleRpcModal = (show) => rpcModal?.classList.toggle("show", show);

function populateRpcInputs() {
  const rpcInputs = document.getElementById("rpc-inputs");
  if (!rpcInputs) return;
  rpcInputs.innerHTML = "";
  getVisibleNetworks().forEach(([network, cfg]) => {
    const div = document.createElement("div");
    const label = document.createElement("label");
    label.innerText = cfg.name;
    const input = Object.assign(document.createElement("input"), {
      id: `${network}-rpc`,
      placeholder: "Enter custom RPC URL",
      value: localStorage.getItem(`${network}-rpc`) || "",
    });
    div.append(label, input);
    rpcInputs.appendChild(div);
  });
}

function saveRpcSettings() {
  getVisibleNetworks().forEach(([network]) => {
    const input = document.getElementById(`${network}-rpc`);
    if (!input) return;
    input.value
      ? localStorage.setItem(`${network}-rpc`, input.value)
      : localStorage.removeItem(`${network}-rpc`);
  });
  toggleRpcModal(false);
}

document
  .getElementsByClassName("rpc-close-btn")[0]
  ?.addEventListener("click", () => toggleRpcModal(false));
document
  .getElementById("save-rpc-btn")
  ?.addEventListener("click", saveRpcSettings);
window.addEventListener("click", (e) => {
  if (e.target === rpcModal) toggleRpcModal(false);
});

// ============================================================
// COPY TO CLIPBOARD
// ============================================================

class Copy {
  static initialized = false;
  static elements = new WeakSet();

  static init() {
    if (this.initialized) return;
    this.initialized = true;
    document.addEventListener("click", this.handleClick.bind(this), true);
    this.observer = new MutationObserver((mutations) =>
      mutations.forEach((m) =>
        m.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;
          if (node.matches?.("[data-copy]")) this.enhance(node);
          node
            .querySelectorAll?.("[data-copy]")
            ?.forEach((el) => this.enhance(el));
        }),
      ),
    );
    this.observer.observe(document.body, { childList: true, subtree: true });
    document.querySelectorAll("[data-copy]").forEach((el) => this.enhance(el));
  }

  static enhance(el) {
    if (this.elements.has(el)) return;
    el.title ||= "Click to copy";
    if (!el.querySelector(".copy-icon-svg"))
      el.insertAdjacentHTML("beforeend", COPY_ICONS.copy);
    this.elements.add(el);
  }

  static handleClick(e) {
    const el = e.target.closest("[data-copy]");
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    this.copy(el.getAttribute("data-copy"), el);
  }

  static async copy(text, el) {
    const success = await navigator.clipboard
      .writeText(text)
      .then(() => true)
      .catch(() => false);
    if (!el) return success;
    const svg = el.querySelector("svg");
    if (!svg) return success;
    const [prevInner, prevTitle] = [svg.innerHTML, el.title];
    svg.innerHTML = success ? COPY_ICONS.success : COPY_ICONS.error;
    el.title = success ? "Copied!" : "Copy failed";
    el.classList.add(success ? "copy-success" : "copy-error");
    setTimeout(() => {
      svg.innerHTML = prevInner;
      el.title = prevTitle || "Click to copy";
      el.classList.remove("copy-success", "copy-error");
    }, TIMINGS.COPY_FEEDBACK_DURATION);
    return success;
  }

  static destroy() {
    this.observer?.disconnect();
    this.initialized = false;
  }
}

onReady(() => Copy.init());

// ============================================================
// NOTIFICATIONS
// ============================================================

export class Notification {
  static container = null;
  static notifications = new Map();
  static transactions = new Map();
  static idCounter = 0;
  static initialized = false;

  static init() {
    if (this.initialized) return;
    this.container =
      document.getElementById("notificationContainer") ||
      (() => {
        const el = document.createElement("div");
        el.id = "notificationContainer";
        document.body.appendChild(el);
        return el;
      })();
    this.initialized = true;
  }

  static show(message, type = "info", options = {}) {
    this.init();
    const config = {
      duration: TIMINGS.NOTIFICATION_DURATION,
      closable: true,
      showProgress: true,
      html: false,
      ...options,
    };
    const id = ++this.idCounter;
    const el = document.createElement("div");
    el.className = `notification ${type}`;
    el.setAttribute("data-id", id);
    const safeMessage = config.html ? message : escapeHtml(message);
    el.innerHTML = `<div class="notif-content"><div class="notif-message"><span>${safeMessage}</span></div>${config.closable ? `<button class="notif-close">&times;</button>` : ""}${config.showProgress && config.duration > 0 ? `<div class="progress-bar" style="animation-duration: ${config.duration}ms"></div>` : ""}</div>`;
    if (config.closable)
      el.querySelector(".notif-close").addEventListener("click", () =>
        this.hide(id),
      );
    this.notifications.set(id, { element: el, config, timeoutId: null });
    this.container.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    if (config.duration > 0) this.scheduleHide(id, config.duration);
    return id;
  }

  static track(tx, options = {}) {
    this.init();
    const config = {
      label: "Transaction",
      onPending: null,
      onSuccess: null,
      onError: null,
      autoRemove: true,
      removeDelay: TIMINGS.TRANSACTION_REMOVE_DELAY,
      ...options,
    };
    const id = tx.hash;
    if (this.transactions.has(id)) return id;
    const chainId = Number(tx.chainId);
    const explorerUrl =
      getNetworkByChainId(chainId)?.explorerUrl ?? "https://etherscan.io/tx/";
    const el = document.createElement("div");
    el.className = "notification tx-notification pending";
    el.setAttribute("data-id", id);
    el.innerHTML = `<div class="notif-content"><div class="tx-icon"><div class="tx-spinner"></div></div><div class="tx-details"><div class="tx-label">${escapeHtml(config.label)}</div><div class="tx-hash"><a href="${explorerUrl}${tx.hash}" target="_blank" rel="noopener noreferrer">${shortenHash(tx.hash)}</a></div></div><div class="tx-status">Pending</div><button class="notif-close">&times;</button></div>`;
    el.querySelector(".notif-close").addEventListener("click", () =>
      this.removeTransaction(id),
    );
    this.transactions.set(id, { element: el, config, status: "pending", tx });
    this.container.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    this.watchTransaction(id, config);
    return id;
  }

  static async watchTransaction(id, config) {
    const txData = this.transactions.get(id);
    if (!txData) return;
    try {
      config.onPending?.(txData.tx.hash);
      const receipt = await txData.tx.wait();
      if (!this.transactions.has(id)) return;
      const ok = receipt.status === 1;
      this.updateTransactionStatus(
        id,
        ok ? "success" : "failed",
        ok ? "Confirmed" : "Failed",
      );
      ok
        ? config.onSuccess?.(receipt)
        : config.onError?.(new Error("Transaction failed"));
    } catch (error) {
      if (this.transactions.has(id)) {
        this.updateTransactionStatus(id, "failed", "Failed");
        config.onError?.(error);
      }
    } finally {
      if (config.autoRemove && this.transactions.has(id))
        setTimeout(() => this.removeTransaction(id), config.removeDelay);
    }
  }

  static updateTransactionStatus(id, status, statusText) {
    const txData = this.transactions.get(id);
    if (!txData) return;
    txData.status = status;
    txData.element.classList.remove("pending", "success", "failed");
    txData.element.classList.add(status);
    const statusEl = txData.element.querySelector(".tx-status");
    if (statusEl) statusEl.textContent = statusText;
    if (status !== "pending")
      txData.element.querySelector(".tx-spinner")?.remove();
  }

  static removeTransaction(id) {
    const txData = this.transactions.get(id);
    if (txData)
      removeElementWithDelay(
        txData.element,
        TIMINGS.NOTIFICATION_HIDE_DELAY,
        () => this.transactions.delete(id),
      );
  }

  static hide(id) {
    const notif = this.notifications.get(id);
    if (!notif) return;
    if (notif.timeoutId) clearTimeout(notif.timeoutId);
    removeElementWithDelay(notif.element, TIMINGS.NOTIFICATION_HIDE_DELAY, () =>
      this.notifications.delete(id),
    );
  }

  static scheduleHide(id, delay) {
    const notif = this.notifications.get(id);
    if (notif) notif.timeoutId = setTimeout(() => this.hide(id), delay);
  }

  static clearTransactions() {
    this.transactions.forEach((_, id) => this.removeTransaction(id));
  }
  static clearAll() {
    this.notifications.forEach((_, id) => this.hide(id));
    this.transactions.forEach((_, id) => this.removeTransaction(id));
  }
}

// ============================================================
// WALLET CONNECTION
// ============================================================

export class ConnectWallet {
  constructor(options = {}) {
    this.networkConfigs = options.networkConfigs || networkConfigs;
    this.providers = [];
    this.storage = options.storage || window.localStorage;
    this.currentProvider = null;
    this.providerListeners = null;
    this.autoConnect = options.autoConnect !== false;
    this.nameResolutionOrder = options.nameResolutionOrder || ["ens", "gns", "wns"];
    this.showUnsupportedNetworkNotification =
      options.showUnsupportedNetworkNotification !== false;
    this.unsupportedNetworkNotificationId = null;

    const networks = Object.values(this.networkConfigs);
    this.chainIdToName = Object.fromEntries(
      networks.map((cfg) => [cfg.chainId, cfg.name]),
    );
    this.allowedChains = networks
      .filter((cfg) => cfg.showInUI)
      .map((cfg) => cfg.chainId);

    onReady(() => this.init());
  }

  init() {
    this.elements = {
      connectBtn: document.querySelector("#connect-btn"),
      connectModal: document.querySelector("#connect-modal"),
      connectChainList: document.querySelector("#connect-chain-list"),
      connectWalletList: document.querySelector("#connect-wallet-list"),
      connectRpc: document.querySelector("#connect-rpc"),
    };
    this.bindEvents();
    this.setupUIEvents();
    this.requestProviders();
    this.initializing = true;
    this.restoreState();
    this.render();
    setTimeout(async () => {
      await this.verifyConnectionState({
        allowUiDisconnect: true,
        retries: 2,
        retryDelayMs: 500,
      });
      this.initializing = false;
    }, 300);
  }

  isAllowed(chainId) {
    return this.allowedChains.includes(normalizeChainId(chainId));
  }

  bindEvents() {
    window.addEventListener("eip6963:announceProvider", (e) =>
      this.handleProviderAnnounce(e),
    );
    const onVisible = () =>
      setTimeout(
        () =>
          this.verifyConnectionState({
            allowUiDisconnect: true,
            retries: 2,
            retryDelayMs: 500,
          }),
        300,
      );
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") onVisible();
    });
  }

  setupUIEvents() {
    this.elements.connectBtn?.addEventListener("click", (e) => {
      if (!e.target.closest("[data-copy]")) {
        e.stopPropagation();
        this.toggleModal();
      }
    });
    this.elements.connectModal?.addEventListener("click", (e) =>
      e.stopPropagation(),
    );
    document.addEventListener("click", () => this.hideModal());
    this.elements.connectRpc?.addEventListener("click", () => {
      populateRpcInputs();
      toggleRpcModal(true);
      this.hideModal();
    });
  }

  requestProviders() {
    window.dispatchEvent(new Event("eip6963:requestProvider"));
  }

  setStorageState(key, value) {
    value === null || value === undefined || value === ""
      ? this.storage.removeItem(key)
      : this.storage.setItem(key, value);
  }

  handleProviderAnnounce({ detail }) {
    if (this.providers.some((p) => p.info.name === detail.info.name)) return;
    this.providers.push(detail);
    this.render();
    if (this.isConnected() && this.getLastWallet() === detail.info.name)
      this.syncConnectedProviderState(detail);
    else if (this.autoConnect && !this.isConnected())
      this.connectWallet(detail.info.name).catch(() => {});
  }

  requestProviderState(provider, method = "eth_accounts") {
    return Promise.all([
      provider.request({ method }),
      provider.request({ method: "eth_chainId" }),
    ]);
  }

  createButton(config, onClick) {
    const btn = document.createElement("button");
    btn.innerHTML = `<img src="${config.icon}">${config.name}<span class="connect-dot" style="display: none"></span>`;
    btn.onclick = onClick;
    return btn;
  }

  async connectWallet(name) {
    const provider = this.getProviderDetail(name);
    if (!provider) return;
    try {
      const [accounts, chainId] = await this.requestProviderState(
        provider.provider,
        "eth_requestAccounts",
      );
      this.setupProviderEvents(provider);
      this.applyConnectedState({
        accounts,
        chainId,
        providerName: provider.info.name,
      });
      this.onConnectCallback?.({
        accounts,
        chainId,
        provider: provider.info.name,
      });
      return { accounts, chainId, provider: provider.provider };
    } catch (error) {
      console.error("Connection failed:", error);
      throw error;
    }
  }

  setupProviderEvents(provider) {
    if (this.currentProvider === provider.provider) return;
    this.removeProviderEvents();
    this.currentProvider = provider.provider;
    const recover = () =>
      this.verifyConnectionState({ allowUiDisconnect: true, retries: 2 });
    this.providerListeners = {
      accountsChanged: (accounts) =>
        accounts.length > 0 ? this.updateAddress(accounts[0]) : recover(),
      chainChanged: (chainId) => this.handleChainChanged(chainId),
      disconnect: recover,
    };
    if (typeof this.currentProvider?.on !== "function") return;
    PROVIDER_EVENTS.forEach((event) =>
      this.currentProvider.on(event, this.providerListeners[event]),
    );
  }

  removeProviderEvents() {
    if (!this.currentProvider || !this.providerListeners) return;
    if (typeof this.currentProvider.removeListener === "function") {
      PROVIDER_EVENTS.forEach((event) =>
        this.currentProvider.removeListener(
          event,
          this.providerListeners[event],
        ),
      );
    } else {
      this.currentProvider.removeAllListeners?.();
    }
  }

  async syncConnectedProviderState(providerDetail) {
    if (!providerDetail?.provider) return;
    this.setupProviderEvents(providerDetail);
    try {
      const [accounts, chainId] = await this.requestProviderState(
        providerDetail.provider,
      );
      this.applyConnectedState({
        accounts,
        chainId,
        providerName: providerDetail.info.name,
      });
    } catch {
      this.render();
    }
  }

  applyDisconnectedState() {
    const hadState =
      this.storage.getItem(STORAGE_KEYS.IS_CONNECTED) === "true" ||
      Boolean(this.getLastWallet()) ||
      Boolean(this.getCurrentChainId());
    if (!hadState) return;
    this.removeProviderEvents();
    this.currentProvider = null;
    this.providerListeners = null;
    CONNECT_STATE_KEYS.forEach((key) => this.storage.removeItem(key));
    this.onDisconnectCallback?.();
    if (this.elements.connectBtn) {
      this.elements.connectBtn.innerHTML = "Connect";
      this.elements.connectBtn.classList.remove("connected", "name-resolved");
    }
    this.elements.connectModal?.classList.remove("show");
    this.render();
  }

  async verifyConnectionState({
    allowUiDisconnect = false,
    retries = 0,
    retryDelayMs = 250,
  } = {}) {
    const provider = this.currentProvider || this.getConnectedProvider();
    if (!provider) return;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const [accounts, chainId] = await this.requestProviderState(provider);
        if (Array.isArray(accounts) && accounts.length > 0) {
          const prevChainId = this.getCurrentChainId();
          this.applyConnectedState({
            accounts,
            chainId,
            providerName: this.getLastWallet(),
            render: false,
          });
          if (hasChainChanged(prevChainId, chainId))
            this.emitChainChange(chainId);
          this.render();
          return;
        }
      } catch {}
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, retryDelayMs));
        continue;
      }
      if (allowUiDisconnect) this.applyDisconnectedState();
    }
  }

  handleChainChanged(chainId) {
    const prev = this.getCurrentChainId();
    this.updateNetworkStatus(chainId);
    this.syncUnsupportedNetworkNotice(chainId);
    if (hasChainChanged(prev, chainId)) this.emitChainChange(chainId);
    this.render();
  }

  emitChainChange(chainId) {
    if (!this.onChainChangeCallback) return;
    const normalized = normalizeChainId(chainId);
    this.onChainChangeCallback({
      chainId: normalized,
      hexChainId: chainIdToHex(normalized),
      name: this.chainIdToName[normalized] || `Unknown (${chainId})`,
      allowed: this.isAllowed(chainId),
    });
  }

  applyConnectedState({ accounts, chainId, providerName, render = true }) {
    const account = Array.isArray(accounts) ? accounts[0] : null;
    if (!account) return;
    this.setStorageState(STORAGE_KEYS.IS_CONNECTED, "true");
    this.setStorageState(STORAGE_KEYS.LAST_WALLET, providerName);

    const currentAddress =
      this.elements.connectBtn?.getAttribute("data-address");
    if (
      !currentAddress ||
      currentAddress.toLowerCase() !== account.toLowerCase()
    ) {
      this.updateAddress(account);
    }

    this.updateNetworkStatus(chainId);
    this.syncUnsupportedNetworkNotice(chainId);
    if (render) this.render();
  }

  showUnsupportedNetworkNotice() {
    if (!this.showUnsupportedNetworkNotification || this.initializing) return;
    if (this.unsupportedNetworkNotificationId)
      Notification.hide(this.unsupportedNetworkNotificationId);
    this.unsupportedNetworkNotificationId = Notification.show(
      "Please switch to a supported network.",
      "error",
      { duration: 0 },
    );
  }

  hideUnsupportedNetworkNotice() {
    if (!this.unsupportedNetworkNotificationId) return;
    Notification.hide(this.unsupportedNetworkNotificationId);
    this.unsupportedNetworkNotificationId = null;
  }

  syncUnsupportedNetworkNotice(chainId) {
    const n = normalizeChainId(chainId);
    if (!Number.isFinite(n)) return;
    this.isAllowed(n)
      ? this.hideUnsupportedNetworkNotice()
      : this.showUnsupportedNetworkNotice();
  }

  updateAddress(address) {
    if (!this.elements.connectBtn) return;
    const short = shortenAddress(address);
    this.elements.connectBtn.innerHTML = `<span class="connect-address-text">${short}</span><span class="connect-copy-btn" data-copy="${address}"></span>`;
    this.elements.connectBtn.classList.add("connected");
    this.elements.connectBtn.classList.remove("name-resolved");
    this.elements.connectBtn.setAttribute("data-address", address);
    this.resolveName(address);
  }

  async resolveWNS(address) {
    try {
      const name = await new ethers.Contract(
        WNS_CONTRACT_ADDRESS,
        WNS_ABI,
        getEthereumProvider(),
      ).reverseResolve(address);
      return name || null;
    } catch {
      return null;
    }
  }

  async resolveGNS(address) {
    try {
      const name = await new ethers.Contract(
        GNS_CONTRACT_ADDRESS,
        GNS_ABI,
        getEthereumProvider(),
      ).reverseResolve(address);
      if (!name) return null;
      return name.endsWith(".gwei") ? name : `${name}.gwei`;
    } catch {
      return null;
    }
  }

  async resolveENS(address) {
    try {
      const provider = getEthereumProvider();
      const ensName = await provider.lookupAddress(address);
      if (!ensName) return ENS_EMPTY_RESULT;
      return { name: ensName, avatar: await provider.getAvatar(ensName) };
    } catch {
      return ENS_EMPTY_RESULT;
    }
  }

  async resolveName(address) {
    if (!this.elements.connectBtn) return;
    const short = shortenAddress(address);
    const resolvers = {
      wns: async () => {
        const name = await this.resolveWNS(address);
        return name ? { name, avatar: null, source: "wns" } : null;
      },
      gns: async () => {
        const name = await this.resolveGNS(address);
        return name ? { name, avatar: null, source: "gns" } : null;
      },
      ens: async () => {
        const { name, avatar } = await this.resolveENS(address);
        return name ? { name, avatar, source: "ens" } : null;
      },
    };
    try {
      let resolved = null;
      for (const source of this.nameResolutionOrder) {
        resolved = await resolvers[source]();
        if (resolved) break;
      }
      if (!resolved?.name) return;
      this.elements.connectBtn.innerHTML = `<div class="name-details"><div class="resolved-name">${resolved.name}</div><div class="named-address-row"><span class="named-address">${short}</span><span class="connect-copy-btn" data-copy="${address}"></span></div></div>${resolved.avatar ? `<img src="${resolved.avatar}" style="border-radius: 50%">` : ""}`;
      this.elements.connectBtn.classList.add("name-resolved");
      this.elements.connectBtn.setAttribute("data-address", address);
      this.elements.connectBtn.setAttribute("data-resolution-source", resolved.source);
    } catch {}
  }

  async switchNetwork(networkConfig) {
    const provider = this.getConnectedProvider();
    if (!provider) return;
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainIdToHex(networkConfig.chainId) }],
      });
      this.hideModal();
      this.updateNetworkStatus(networkConfig.chainId);
      this.render();
    } catch (error) {
      console.error("Network switch failed:", error);
      throw error;
    }
  }

  updateNetworkStatus(chainId) {
    const n = normalizeChainId(chainId);
    if (Number.isFinite(n))
      this.setStorageState(STORAGE_KEYS.CHAIN_ID, chainIdToHex(n));
  }

  async disconnect() {
    try {
      await this.getConnectedProvider()?.request({
        method: "wallet_revokePermissions",
        params: [{ eth_accounts: {} }],
      });
    } catch (error) {
      console.error("Disconnect failed:", error);
    }
    this.applyDisconnectedState();
  }

  toggleModal() {
    this.elements.connectModal?.classList.toggle("show");
  }
  hideModal() {
    this.elements.connectModal?.classList.remove("show");
  }

  render() {
    this.renderWalletProviders();
    this.renderChainList();
    const getWalletEl = document.querySelector("#connect-get-wallet");
    if (getWalletEl)
      getWalletEl.style.display = this.providers.length ? "none" : "block";
  }

  renderWalletProviders() {
    if (!this.elements.connectWalletList) return;
    this.elements.connectWalletList.innerHTML = "";
    this.providers.forEach((provider) => {
      const btn = this.createButton(provider.info, () => {
        this.hideModal();
        this.connectWallet(provider.info.name);
      });
      btn.querySelector(".connect-dot").style.display =
        provider.info.name === this.getLastWallet() ? "inline-block" : "none";
      this.elements.connectWalletList.appendChild(btn);
    });
  }

  renderChainList() {
    if (!this.elements.connectChainList) return;
    this.elements.connectChainList.innerHTML = "";
    const currentChainId = normalizeChainId(this.getCurrentChainId());
    const isConnected = this.isConnected();
    const networks = getVisibleNetworks();
    const single = networks.length === 1;
    this.elements.connectChainList.classList.toggle("single-network", single);
    networks.forEach(([networkName, cfg]) => {
      const btn = document.createElement("button");
      btn.id = `connect-${networkName}`;
      btn.title = cfg.name;
      btn.classList.toggle("chain-single", single);
      btn.innerHTML = single
        ? `<img src="${cfg.icon}" alt="${cfg.name}"><span class="connect-name">${cfg.name}</span>`
        : `<img src="${cfg.icon}" alt="${cfg.name}">`;
      btn.onclick = () => this.switchNetwork(cfg);
      const dot = document.createElement("span");
      dot.className = `connect-dot${single ? "" : "-icon"}`;
      dot.style.display =
        isConnected && cfg.chainId === currentChainId ? "inline-block" : "none";
      btn.appendChild(dot);
      this.elements.connectChainList.appendChild(btn);
    });
  }

  restoreState() {
    const storedChainId =
      this.getCurrentChainId() ||
      chainIdToHex(this.networkConfigs.ethereum.chainId);
    this.updateNetworkStatus(storedChainId);
    this.syncUnsupportedNetworkNotice(storedChainId);
    const providerDetail =
      this.isConnected() && this.getProviderDetail(this.getLastWallet());
    if (providerDetail) this.syncConnectedProviderState(providerDetail);
  }

  isConnected() {
    return this.storage.getItem(STORAGE_KEYS.IS_CONNECTED) === "true";
  }
  getCurrentChainId() {
    return this.storage.getItem(STORAGE_KEYS.CHAIN_ID);
  }
  getLastWallet() {
    return this.storage.getItem(STORAGE_KEYS.LAST_WALLET);
  }
  getProviderDetail(name) {
    return name
      ? this.providers.find((p) => p.info.name === name) || null
      : null;
  }
  getConnectedProvider() {
    return this.getProviderDetail(this.getLastWallet())?.provider;
  }

  async getAccount() {
    try {
      const accounts = await this.getConnectedProvider()?.request({
        method: "eth_accounts",
      });
      return accounts?.[0] || null;
    } catch (error) {
      console.error("Failed to get account:", error);
      return null;
    }
  }

  async getChainId() {
    try {
      return normalizeChainId(
        await this.getConnectedProvider()?.request({ method: "eth_chainId" }),
      );
    } catch (error) {
      console.error("Failed to get chain ID:", error);
      return null;
    }
  }

  getProvider() {
    return this.getConnectedProvider();
  }
  getEthersProvider() {
    const p = this.getConnectedProvider();
    return p ? new ethers.BrowserProvider(p) : null;
  }
  getShortAddr(address) {
    return address ? shortenAddress(address) : "";
  }
  async getResolvedName(address) {
    if (!address) return "";
    const resolvers = {
      wns: () => this.resolveWNS(address),
      gns: () => this.resolveGNS(address),
      ens: async () => {
        const { name } = await this.resolveENS(address);
        return name;
      },
    };
    try {
      for (const source of this.nameResolutionOrder) {
        const name = await resolvers[source]();
        if (name) return name;
      }
    } catch {}
    return this.getShortAddr(address);
  }
  onConnect(cb) {
    this.onConnectCallback = cb;
  }
  onDisconnect(cb) {
    this.onDisconnectCallback = cb;
  }
  onChainChange(cb) {
    this.onChainChangeCallback = cb;
  }

  setNameResolutionOrder(order) {
    if (!Array.isArray(order) || order.length === 0) {
      console.warn("Invalid name resolution order. Pass an array like ['ens', 'gns', 'wns']");
      return;
    }
    this.nameResolutionOrder = order;
    if (this.isConnected())
      this.getAccount().then((addr) => addr && this.resolveName(addr));
  }

  getNameResolutionOrder() {
    return this.nameResolutionOrder;
  }
}
