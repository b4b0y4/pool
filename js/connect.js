import { ethers } from "./libs/ethers.min.js";
import { networkConfigs } from "./connect-config.js";
import Copy from "./copy.js";
import { getRpcUrl } from "./rpcModal.js";

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

export default ConnectWallet;
