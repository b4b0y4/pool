import NotificationSystem from "./notifications.js";
import { ConnectWallet } from "./connect.js";
import { poolContracts } from "./pool-contracts.js";
import { ethers } from "./libs/ethers.min.js";
import { networkConfigs } from "./connect-config.js";

const wallet = new ConnectWallet();

document.addEventListener("DOMContentLoaded", () => {
  // #region Elements
  const elements = {
    connectBtn: document.querySelector("#connect-btn"),
    connectChainList: document.querySelector("#connect-chain-list"),
    connectWalletList: document.querySelector("#connect-wallet-list"),
    connectWallets: document.querySelector("#connect-wallets"),
    deposit: {
      toggleBtn: document.querySelector("#deposit-toggle-btn"),
      accordion: document.querySelector("#deposit-accordion"),
      balance: document.querySelector("#deposit-asset-balance"),
      input: document.querySelector("#deposit-amount-input"),
      maxBtn: document.querySelector("#deposit-max-btn"),
      executeBtn: document.querySelector("#deposit-execute-btn"),
    },
    redeem: {
      toggleBtn: document.querySelector("#redeem-toggle-btn"),
      accordion: document.querySelector("#redeem-accordion"),
      balance: document.querySelector("#redeem-shares-balance"),
      input: document.querySelector("#redeem-amount-input"),
      maxBtn: document.querySelector("#redeem-max-btn"),
      executeBtn: document.querySelector("#redeem-execute-btn"),
    },
    networkLogo: document.getElementById("network-logo"),
  };
  // #endregion

  let rawBalances = { asset: "0", shares: "0" };

  // #region Wallet & Chain Events
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
    updateBalances();
  });

  wallet.onDisconnect(() => {
    NotificationSystem.show("Wallet disconnected", "warning");
    updateBalances();
  });

  wallet.onChainChange(({ name }) => {
    NotificationSystem.show(`Switched to ${name}`, "info");
    updateBalances();
  });
  // #endregion

  // #region Accordion Logic
  const toggleAccordion = (accordion) => {
    const otherAccordion =
      accordion === elements.deposit.accordion
        ? elements.redeem.accordion
        : elements.deposit.accordion;
    const isOpen = accordion.classList.toggle("open");

    otherAccordion.classList.remove("open");
    otherAccordion.style.maxHeight = null;

    accordion.style.maxHeight = isOpen ? accordion.scrollHeight + "px" : null;
  };

  elements.deposit.toggleBtn.addEventListener("click", () =>
    toggleAccordion(elements.deposit.accordion),
  );
  elements.redeem.toggleBtn.addEventListener("click", () =>
    toggleAccordion(elements.redeem.accordion),
  );
  // #endregion

  // #region Balance & UI Updates
  async function updateBalances() {
    if (!wallet.isConnected()) {
      elements.deposit.balance.innerText = "0";
      elements.redeem.balance.innerText = "0";
      elements.networkLogo.style.display = "none";
      return;
    }

    try {
      const provider = wallet.getEthersProvider();
      if (!provider) return;

      const network = await provider.getNetwork();
      const chainId = network.chainId;

      const currentNetworkConfig = Object.values(networkConfigs).find(
        (config) => config.chainId === Number(chainId),
      );

      if (currentNetworkConfig) {
        elements.networkLogo.src = currentNetworkConfig.icon;
        elements.networkLogo.style.display = "block";
      } else {
        elements.networkLogo.style.display = "none";
      }

      if (chainId !== 10n) {
        elements.deposit.balance.innerText = "Wrong Network";
        elements.redeem.balance.innerText = "Wrong Network";
        return;
      }

      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      const opVaultContract = new ethers.Contract(
        poolContracts.OPVAULT.address,
        poolContracts.OPVAULT.abi,
        signer,
      );

      const assetAddress = await opVaultContract.asset();
      const assetAbi = [
        "function balanceOf(address account) view returns (uint256)",
        "function decimals() view returns (uint8)",
      ];
      const assetContract = new ethers.Contract(assetAddress, assetAbi, signer);

      const [rawAssetBalance, assetDecimals, rawSharesBalance, sharesDecimals] =
        await Promise.all([
          assetContract.balanceOf(userAddress),
          assetContract.decimals(),
          opVaultContract.balanceOf(userAddress),
          opVaultContract.decimals(),
        ]);

      const formattedAsset = ethers.formatUnits(rawAssetBalance, assetDecimals);
      const formattedShares = ethers.formatUnits(
        rawSharesBalance,
        sharesDecimals,
      );

      rawBalances = { asset: formattedAsset, shares: formattedShares };

      elements.deposit.balance.innerText = formattedAsset;
      elements.redeem.balance.innerText = formattedShares;
    } catch (error) {
      console.error("Failed to update balances:", error);
      elements.deposit.balance.innerText = "Error";
      elements.redeem.balance.innerText = "Error";
    }
  }

  elements.deposit.maxBtn.addEventListener("click", () => {
    elements.deposit.input.value = rawBalances.asset;
  });

  elements.redeem.maxBtn.addEventListener("click", () => {
    elements.redeem.input.value = rawBalances.shares;
  });
  // #endregion

  // #region Transaction Logic
  elements.deposit.executeBtn.addEventListener("click", async () => {
    const amount = elements.deposit.input.value;
    if (!amount) {
      NotificationSystem.show("Please enter an amount.", "danger");
      return;
    }

    try {
      const provider = wallet.getEthersProvider();
      if (!provider) throw new Error("Could not get wallet provider.");

      const network = await provider.getNetwork();
      if (network.chainId !== 10n)
        throw new Error("Please switch to the Optimism network.");

      const signer = await provider.getSigner();
      const opVaultContract = new ethers.Contract(
        poolContracts.OPVAULT.address,
        poolContracts.OPVAULT.abi,
        signer,
      );
      const receiver = await signer.getAddress();

      const assetAddress = await opVaultContract.asset();
      const assetAbi = [
        "function approve(address spender, uint256 amount) public returns (bool)",
        "function allowance(address owner, address spender) public view returns (uint256)",
        "function decimals() view returns (uint8)",
      ];
      const assetContract = new ethers.Contract(assetAddress, assetAbi, signer);

      const assetDecimals = await assetContract.decimals();
      const amountInWei = ethers.parseUnits(amount, assetDecimals);

      const allowance = await assetContract.allowance(
        receiver,
        poolContracts.OPVAULT.address,
      );

      if (allowance < amountInWei) {
        NotificationSystem.show("Approving token transfer...", "info");
        const approveTx = await assetContract.approve(
          poolContracts.OPVAULT.address,
          amountInWei,
        );
        await provider.waitForTransaction(approveTx.hash);
        NotificationSystem.show("Approval successful!", "success");
      }

      NotificationSystem.show("Depositing...", "info");
      const tx = await opVaultContract.deposit(amountInWei, receiver);
      await provider.waitForTransaction(tx.hash);

      NotificationSystem.show("Deposit successful!", "success");
      elements.deposit.input.value = "";
      updateBalances();
    } catch (error) {
      console.error(error);
      NotificationSystem.show(
        error.reason || error.message || "Deposit failed.",
        "danger",
      );
    }
  });

  elements.redeem.executeBtn.addEventListener("click", async () => {
    const amount = elements.redeem.input.value;
    if (!amount) {
      NotificationSystem.show(
        "Please enter an amount of shares to redeem.",
        "danger",
      );
      return;
    }

    try {
      const provider = wallet.getEthersProvider();
      if (!provider) throw new Error("Could not get wallet provider.");

      const network = await provider.getNetwork();
      if (network.chainId !== 10n)
        throw new Error("Please switch to the Optimism network.");

      const signer = await provider.getSigner();
      const opVaultContract = new ethers.Contract(
        poolContracts.OPVAULT.address,
        poolContracts.OPVAULT.abi,
        signer,
      );

      const sharesDecimals = await opVaultContract.decimals();
      const sharesAmount = ethers.parseUnits(amount, sharesDecimals);

      const receiver = await signer.getAddress();
      const owner = await signer.getAddress();

      NotificationSystem.show("Redeeming shares...", "info");
      const tx = await opVaultContract.redeem(sharesAmount, receiver, owner);
      await provider.waitForTransaction(tx.hash);

      NotificationSystem.show("Redeem successful!", "success");
      elements.redeem.input.value = "";
      updateBalances();
    } catch (error) {
      console.error(error);
      NotificationSystem.show(
        error.reason || error.message || "Redeem failed.",
        "danger",
      );
    }
  });
  // #endregion

  updateBalances();
});

window.walletConnect = wallet;
