import { ethers } from "./libs/ethers.min.js";
import {
  ConnectWallet,
  Notification,
  getRpcUrl,
  networkConfigs,
} from "./dappkit.js";

// Configuration
const CONFIG = {
  tokenIconMap: {
    WETH: "./assets/img/weth.png",
    przWETH: "./assets/img/przweth.png",
  },
  wethAddresses: {
    10: "0x4200000000000000000000000000000000000006", // Optimism
    8453: "0x4200000000000000000000000000000000000006", // Base
    1: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // Mainnet
    42161: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // Arbitrum
  },
  prizeVaultAddress: {
    10: "0x2998c1685E308661123F64B333767266035f5020",
    8453: "0x4E42f783db2D0C5bDFf40fDc66FCAe8b1Cda4a43",
    1: "0x3acd377dA549010a197b9Ed0F271e1f621e4b62e",
    42161: "0x7b0949204e7Da1B0beD6d4CCb68497F51621b574",
  },
  gasReserve: 0.001,
  maxDecimals: 9,
};

// ABIs
const ABIS = {
  weth: ["function deposit() payable", "function withdraw(uint256 wad)"],
  prizeVault: [
    "function redeem(uint256 _shares, address _receiver, address _owner) external returns (uint256)",
    "function deposit(uint256 _assets, address _receiver) external returns (uint256)",
    "function asset() view returns (address)",
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
  ],
  erc20: [
    "function balanceOf(address account) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function approve(address, uint256) returns (bool)",
    "function allowance(address, address) view returns (uint256)",
  ],
};

// Utility Functions
function formatBalance(balanceString, maxDecimals = CONFIG.maxDecimals) {
  if (!balanceString || !balanceString.includes(".")) {
    return balanceString || "0";
  }
  const [integerPart, decimalPart] = balanceString.split(".");
  return `${integerPart}.${decimalPart.substring(0, maxDecimals)}`;
}

function getVaultContract(chainId) {
  const address = CONFIG.prizeVaultAddress[Number(chainId)];
  return address ? { address, abi: ABIS.prizeVault } : null;
}

function getSupportedNetworksList() {
  return Object.keys(CONFIG.prizeVaultAddress)
    .map((id) => {
      const config = Object.values(networkConfigs).find(
        (nc) => nc.chainId == id,
      );
      return config?.name;
    })
    .filter(Boolean)
    .join(", ");
}

function getNetworkName(wallet, chainId) {
  return Object.keys(wallet.networkConfigs).find(
    (n) => wallet.networkConfigs[n].chainId === chainId,
  );
}

// UI Manager
class UIManager {
  constructor() {
    this.elements = {
      deposit: {
        toggleBtn: document.querySelector("#deposit-toggle-btn"),
        accordion: document.querySelector("#deposit-accordion"),
        balanceLabel: document.querySelector(
          "#deposit-accordion .balance-display span",
        ),
        balance: document.querySelector("#deposit-asset-balance"),
        icon: document.querySelector("#deposit-token-icon"),
        input: document.querySelector("#deposit-amount-input"),
        maxBtn: document.querySelector("#deposit-max-btn"),
        executeBtn: document.querySelector("#deposit-execute-btn"),
      },
      redeem: {
        toggleBtn: document.querySelector("#redeem-toggle-btn"),
        accordion: document.querySelector("#redeem-accordion"),
        balanceLabel: document.querySelector(
          "#redeem-accordion .balance-display span",
        ),
        balance: document.querySelector("#redeem-shares-balance"),
        icon: document.querySelector("#redeem-token-icon"),
        input: document.querySelector("#redeem-amount-input"),
        maxBtn: document.querySelector("#redeem-max-btn"),
        executeBtn: document.querySelector("#redeem-execute-btn"),
      },
      wrap: {
        toggleBtn: document.querySelector("#wrap-toggle-btn"),
        accordion: document.querySelector("#wrap-accordion"),
        ethBalance: document.querySelector("#eth-balance"),
        wethBalance: document.querySelector("#weth-balance"),
        input: document.querySelector("#wrap-amount-input"),
        wrapBtn: document.querySelector("#wrap-execute-btn"),
        unwrapBtn: document.querySelector("#unwrap-execute-btn"),
        maxEthBtn: document.querySelector("#wrap-max-eth-btn"),
        maxWethBtn: document.querySelector("#wrap-max-weth-btn"),
      },
      networkLogo: document.getElementById("network-logo"),
    };
  }

  toggleAccordion(accordionToShow) {
    const accordions = [
      this.elements.deposit.accordion,
      this.elements.redeem.accordion,
      this.elements.wrap.accordion,
    ];

    accordions.forEach((acc) => {
      const isOpen = acc === accordionToShow && !acc.classList.contains("open");
      acc.classList.toggle("open", isOpen);
      acc.style.maxHeight = isOpen ? acc.scrollHeight + "px" : null;
    });
  }

  updateBalance(section, value) {
    this.elements[section].balance.innerText = formatBalance(value);
  }

  updateTokenIcon(section, symbol) {
    const iconUrl = CONFIG.tokenIconMap[symbol];
    this.elements[section].icon.src = iconUrl || "";
    this.elements[section].icon.style.display = iconUrl ? "block" : "none";
  }

  setButtonState(section, disabled) {
    this.elements[section].toggleBtn.disabled = disabled;
  }

  setProcessingState(isProcessing) {
    [
      this.elements.deposit.executeBtn,
      this.elements.redeem.executeBtn,
      this.elements.wrap.wrapBtn,
      this.elements.wrap.unwrapBtn,
    ].forEach((btn) => {
      btn.disabled = isProcessing;
      btn.style.opacity = isProcessing ? "0.6" : "1";
      btn.style.cursor = isProcessing ? "not-allowed" : "pointer";
    });
  }

  resetToDisconnected() {
    this.updateBalance("deposit", "0");
    this.updateBalance("redeem", "0");
    this.elements.wrap.ethBalance.innerText = "0";
    this.elements.wrap.wethBalance.innerText = "0";
    this.elements.networkLogo.style.display = "none";
    this.setButtonState("deposit", true);
    this.setButtonState("redeem", true);
    this.setButtonState("wrap", true);
    this.elements.deposit.icon.style.display = "none";
    this.elements.redeem.icon.style.display = "none";
  }

  showUnsupportedVault() {
    this.elements.deposit.balance.innerText = "Unsupported Vault";
    this.elements.redeem.balance.innerText = "";
    this.elements.deposit.balanceLabel.innerText = "Status:";
    this.elements.redeem.balanceLabel.innerText = "";
    this.setButtonState("deposit", true);
    this.setButtonState("redeem", true);

    [this.elements.deposit.accordion, this.elements.redeem.accordion].forEach(
      (acc) => {
        acc.classList.remove("open");
        acc.style.maxHeight = null;
      },
    );

    this.elements.deposit.icon.style.display = "none";
    this.elements.redeem.icon.style.display = "none";
  }
}

// Contract Interactions
class ContractManager {
  constructor(wallet) {
    this.wallet = wallet;
    this.rawBalances = { asset: "0", shares: "0", eth: "0" };
    this.isNetworkSupported = true;
  }

  async updateBalances(ui) {
    if (!this.wallet.isConnected()) {
      ui.resetToDisconnected();
      return;
    }

    try {
      const provider = this.wallet.getEthersProvider();
      const chainId = await this.wallet.getChainId();
      const userAddress = await this.wallet.getAccount();

      if (!userAddress) throw new Error("Unable to get user address");

      // Update network logo
      const networkConfig = Object.values(networkConfigs).find(
        (config) => config.chainId === chainId,
      );
      if (networkConfig) {
        ui.elements.networkLogo.src = networkConfig.icon;
        ui.elements.networkLogo.title = networkConfig.name;
        ui.elements.networkLogo.style.display = "block";
      } else {
        ui.elements.networkLogo.style.display = "none";
      }

      // Update ETH balance
      const ethBalance = await provider.getBalance(userAddress);
      const formattedEth = ethers.formatUnits(ethBalance, 18);
      this.rawBalances.eth = formattedEth;
      ui.elements.wrap.ethBalance.innerText = formatBalance(formattedEth);

      // Update WETH button state
      ui.setButtonState("wrap", !CONFIG.wethAddresses[chainId]);

      // Update vault balances
      const currentVault = getVaultContract(chainId);
      if (!currentVault) {
        if (this.isNetworkSupported) {
          const message = `Unsupported network for vault. Please switch to: ${getSupportedNetworksList()}.`;
          Notification.show(message, "warning");
        }
        this.isNetworkSupported = false;
        ui.showUnsupportedVault();
        return;
      }

      this.isNetworkSupported = true;
      ui.setButtonState("deposit", false);
      ui.setButtonState("redeem", false);

      const signer = await provider.getSigner();
      const vaultContract = new ethers.Contract(
        currentVault.address,
        currentVault.abi,
        signer,
      );
      const assetAddress = await vaultContract.asset();
      const assetContract = new ethers.Contract(
        assetAddress,
        ABIS.erc20,
        signer,
      );

      const [
        rawAssetBalance,
        assetDecimals,
        rawSharesBalance,
        sharesDecimals,
        assetSymbol,
        vaultSymbol,
      ] = await Promise.all([
        assetContract.balanceOf(userAddress),
        assetContract.decimals(),
        vaultContract.balanceOf(userAddress),
        vaultContract.decimals(),
        assetContract.symbol(),
        vaultContract.symbol(),
      ]);

      const formattedAsset = ethers.formatUnits(rawAssetBalance, assetDecimals);
      const formattedShares = ethers.formatUnits(
        rawSharesBalance,
        sharesDecimals,
      );

      this.rawBalances.asset = formattedAsset;
      this.rawBalances.shares = formattedShares;

      ui.updateBalance("deposit", formattedAsset);
      ui.updateBalance("redeem", formattedShares);
      ui.elements.wrap.wethBalance.innerText = formatBalance(formattedAsset);

      ui.elements.deposit.balanceLabel.innerText = `${assetSymbol}:`;
      ui.elements.deposit.input.placeholder = `Enter ${assetSymbol} amount`;
      ui.elements.deposit.executeBtn.innerText = `Deposit ${assetSymbol}`;

      ui.elements.redeem.balanceLabel.innerText = `${vaultSymbol}:`;
      ui.elements.redeem.input.placeholder = `Enter ${vaultSymbol} amount`;
      ui.elements.redeem.executeBtn.innerText = `Redeem ${vaultSymbol}`;

      ui.updateTokenIcon("deposit", assetSymbol);
      ui.updateTokenIcon("redeem", vaultSymbol);
    } catch (error) {
      console.error("Failed to update balances:", error);
      ui.elements.deposit.balance.innerText = "Error";
      ui.elements.redeem.balance.innerText = "Error";
      Notification.show("Failed to load balances", "danger");
    }
  }

  async executeWrap(amount, ui) {
    const chainId = await this.wallet.getChainId();
    const wethAddress = CONFIG.wethAddresses[chainId];
    if (!wethAddress) throw new Error("WETH not available on this network");

    const provider = this.wallet.getEthersProvider();
    const signer = await provider.getSigner();
    const wethContract = new ethers.Contract(wethAddress, ABIS.weth, signer);
    const amountInWei = ethers.parseEther(amount);

    const networkName = getNetworkName(this.wallet, chainId);
    const rpcUrl = getRpcUrl(networkName);

    const tx = await wethContract.deposit({ value: amountInWei });
    Notification.track(tx.hash, chainId, rpcUrl, { label: "Wrapping ETH" });

    ui.elements.wrap.input.value = "";
    await this.updateBalances(ui);
  }

  async executeUnwrap(amount, ui) {
    const chainId = await this.wallet.getChainId();
    const wethAddress = CONFIG.wethAddresses[chainId];
    if (!wethAddress) throw new Error("WETH not available on this network");

    const provider = this.wallet.getEthersProvider();
    const signer = await provider.getSigner();
    const wethContract = new ethers.Contract(wethAddress, ABIS.weth, signer);
    const amountInWei = ethers.parseEther(amount);

    const networkName = getNetworkName(this.wallet, chainId);
    const rpcUrl = getRpcUrl(networkName);

    const tx = await wethContract.withdraw(amountInWei);
    Notification.track(tx.hash, chainId, rpcUrl, { label: "Unwrapping WETH" });

    ui.elements.wrap.input.value = "";
    await this.updateBalances(ui);
  }

  async executeDeposit(amount, ui) {
    const chainId = await this.wallet.getChainId();
    const currentVault = getVaultContract(chainId);
    if (!currentVault) throw new Error("Unsupported network for this action");

    const provider = this.wallet.getEthersProvider();
    const signer = await provider.getSigner();
    const receiver = await this.wallet.getAccount();

    const vaultContract = new ethers.Contract(
      currentVault.address,
      currentVault.abi,
      signer,
    );
    const assetAddress = await vaultContract.asset();
    const assetContract = new ethers.Contract(assetAddress, ABIS.erc20, signer);
    const assetDecimals = await assetContract.decimals();
    const amountInWei = ethers.parseUnits(amount, assetDecimals);

    const networkName = getNetworkName(this.wallet, chainId);
    const rpcUrl = getRpcUrl(networkName);

    const allowance = await assetContract.allowance(
      receiver,
      currentVault.address,
    );
    if (allowance < amountInWei) {
      const approveTx = await assetContract.approve(
        currentVault.address,
        amountInWei,
      );
      Notification.track(approveTx.hash, chainId, rpcUrl, {
        label: "Approving Token Transfer",
      });
      await provider.waitForTransaction(approveTx.hash);
    }

    const tx = await vaultContract.deposit(amountInWei, receiver);
    Notification.track(tx.hash, chainId, rpcUrl, {
      label: "Depositing to Vault",
    });

    ui.elements.deposit.input.value = "";
    await this.updateBalances(ui);
  }

  async executeRedeem(amount, ui) {
    const chainId = await this.wallet.getChainId();
    const currentVault = getVaultContract(chainId);
    if (!currentVault) throw new Error("Unsupported network for this action");

    const provider = this.wallet.getEthersProvider();
    const signer = await provider.getSigner();
    const owner = await this.wallet.getAccount();

    const vaultContract = new ethers.Contract(
      currentVault.address,
      currentVault.abi,
      signer,
    );
    const sharesDecimals = await vaultContract.decimals();
    const sharesAmount = ethers.parseUnits(amount, sharesDecimals);

    const networkName = getNetworkName(this.wallet, chainId);
    const rpcUrl = getRpcUrl(networkName);

    const tx = await vaultContract.redeem(sharesAmount, owner, owner);
    Notification.track(tx.hash, chainId, rpcUrl, { label: "Redeeming Shares" });

    ui.elements.redeem.input.value = "";
    await this.updateBalances(ui);
  }
}

// Main Application
class VaultApp {
  constructor() {
    this.wallet = new ConnectWallet();
    this.ui = new UIManager();
    this.contracts = new ContractManager(this.wallet);
    this.isProcessing = false;
  }

  init() {
    this.setupWalletEvents();
    this.setupUIEvents();
    this.contracts.updateBalances(this.ui);
  }

  setupWalletEvents() {
    this.wallet.onConnect((data) => {
      const account = data.accounts[0];
      const shortAccount = `${account.slice(0, 6)}...${account.slice(-4)}`;
      Notification.show(
        `Connected to ${this.wallet.getLastWallet()} with account ${shortAccount}`,
        "success",
      );
      this.contracts.updateBalances(this.ui);
    });

    this.wallet.onDisconnect(() => {
      Notification.show("Wallet disconnected", "warning");
      this.contracts.updateBalances(this.ui);
    });

    this.wallet.onChainChange(({ name }) => {
      Notification.show(`Switched to ${name}`, "info");
      this.contracts.updateBalances(this.ui);
    });
  }

  setupUIEvents() {
    // Accordion toggles
    this.ui.elements.deposit.toggleBtn.addEventListener("click", () =>
      this.ui.toggleAccordion(this.ui.elements.deposit.accordion),
    );
    this.ui.elements.redeem.toggleBtn.addEventListener("click", () =>
      this.ui.toggleAccordion(this.ui.elements.redeem.accordion),
    );
    this.ui.elements.wrap.toggleBtn.addEventListener("click", () =>
      this.ui.toggleAccordion(this.ui.elements.wrap.accordion),
    );

    // Max buttons
    this.ui.elements.deposit.maxBtn.addEventListener("click", () => {
      this.ui.elements.deposit.input.value = this.contracts.rawBalances.asset;
    });

    this.ui.elements.redeem.maxBtn.addEventListener("click", () => {
      this.ui.elements.redeem.input.value = this.contracts.rawBalances.shares;
    });

    this.ui.elements.wrap.maxEthBtn.addEventListener("click", () => {
      const maxEth =
        parseFloat(this.contracts.rawBalances.eth) - CONFIG.gasReserve;
      this.ui.elements.wrap.input.value = maxEth > 0 ? maxEth.toString() : "0";
    });

    this.ui.elements.wrap.maxWethBtn.addEventListener("click", () => {
      this.ui.elements.wrap.input.value = this.contracts.rawBalances.asset;
    });

    // Execute buttons
    this.ui.elements.deposit.executeBtn.addEventListener("click", () => {
      this.handleTransaction(async () => {
        const amount = this.ui.elements.deposit.input.value;
        if (!amount) throw new Error("Please enter an amount");
        await this.contracts.executeDeposit(amount, this.ui);
      });
    });

    this.ui.elements.redeem.executeBtn.addEventListener("click", () => {
      this.handleTransaction(async () => {
        const amount = this.ui.elements.redeem.input.value;
        if (!amount) throw new Error("Please enter an amount");
        await this.contracts.executeRedeem(amount, this.ui);
      });
    });

    this.ui.elements.wrap.wrapBtn.addEventListener("click", () => {
      this.handleTransaction(async () => {
        const amount = this.ui.elements.wrap.input.value;
        if (!amount) throw new Error("Please enter an amount");
        await this.contracts.executeWrap(amount, this.ui);
      });
    });

    this.ui.elements.wrap.unwrapBtn.addEventListener("click", () => {
      this.handleTransaction(async () => {
        const amount = this.ui.elements.wrap.input.value;
        if (!amount) throw new Error("Please enter an amount");
        await this.contracts.executeUnwrap(amount, this.ui);
      });
    });
  }

  async handleTransaction(transactionFn) {
    if (this.isProcessing) return;

    this.isProcessing = true;
    this.ui.setProcessingState(true);

    try {
      await transactionFn();
    } catch (err) {
      console.error("Transaction error:", err);
      Notification.show(
        err.reason || err.message || "Transaction failed",
        "danger",
      );
    } finally {
      this.isProcessing = false;
      this.ui.setProcessingState(false);
    }
  }
}

// Initialize app
document.addEventListener("DOMContentLoaded", () => {
  const app = new VaultApp();
  app.init();
});
