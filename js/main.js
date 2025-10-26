import { poolContracts } from "./pool-contracts.js";
import { ethers } from "./libs/ethers.min.js";
import {
  ConnectWallet,
  Notification,
  getRpcUrl,
  networkConfigs,
} from "./dappkit.js";

const wallet = new ConnectWallet();

const tokenIconMap = {
  WETH: "./assets/img/weth.png",
  przWETH: "./assets/img/przweth.png",
};

const wethAddresses = {
  10: "0x4200000000000000000000000000000000000006", // Optimism
  8453: "0x4200000000000000000000000000000000000006", // Base
  1: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // Mainnet
};

const wethAbi = [
  "function deposit() payable",
  "function withdraw(uint256 wad)",
];

document.addEventListener("DOMContentLoaded", () => {
  const elements = {
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
  const accordions = [
    elements.deposit.accordion,
    elements.redeem.accordion,
    elements.wrap.accordion,
  ];

  let rawBalances = { asset: "0", shares: "0", eth: "0" };
  let isNetworkSupported = true;

  wallet.onConnect((data) => {
    const account = data.accounts[0];
    const shortAccount = `${account.slice(0, 6)}...${account.slice(-4)}`;
    const providerName = wallet.getLastWallet();

    Notification.show(
      `Connected to ${providerName} with account ${shortAccount}`,
      "success",
    );
    updateBalances();
  });

  wallet.onDisconnect(() => {
    Notification.show("Wallet disconnected", "warning");
    updateBalances();
  });

  wallet.onChainChange(({ name }) => {
    Notification.show(`Switched to ${name}`, "info");
    updateBalances();
  });

  const toggleAccordion = (accordionToShow) => {
    accordions.forEach((acc) => {
      const isOpen = acc === accordionToShow && !acc.classList.contains("open");
      acc.classList.toggle("open", isOpen);
      acc.style.maxHeight = isOpen ? acc.scrollHeight + "px" : null;
    });
  };

  elements.deposit.toggleBtn.addEventListener("click", () =>
    toggleAccordion(elements.deposit.accordion),
  );
  elements.redeem.toggleBtn.addEventListener("click", () =>
    toggleAccordion(elements.redeem.accordion),
  );
  elements.wrap.toggleBtn.addEventListener("click", () =>
    toggleAccordion(elements.wrap.accordion),
  );

  function getCurrentVaultContract(chainId) {
    return poolContracts[Number(chainId)];
  }

  function formatBalance(balanceString, maxDecimals = 9) {
    if (!balanceString.includes(".")) {
      return balanceString;
    }
    const parts = balanceString.split(".");
    const integerPart = parts[0];
    const decimalPart = parts[1].substring(0, maxDecimals);
    return `${integerPart}.${decimalPart}`;
  }

  async function updateBalances() {
    if (!wallet.isConnected()) {
      elements.deposit.balance.innerText = "0";
      elements.redeem.balance.innerText = "0";
      elements.wrap.ethBalance.innerText = "0";
      elements.wrap.wethBalance.innerText = "0";
      elements.networkLogo.style.display = "none";
      elements.deposit.toggleBtn.disabled = true;
      elements.redeem.toggleBtn.disabled = true;
      elements.wrap.toggleBtn.disabled = true;
      elements.deposit.icon.style.display = "none";
      elements.redeem.icon.style.display = "none";
      return;
    }

    try {
      const provider = wallet.getEthersProvider();
      if (!provider) return;

      const chainId = await wallet.getChainId();
      const currentVault = getCurrentVaultContract(chainId);

      const currentNetworkConfig = Object.values(networkConfigs).find(
        (config) => config.chainId === chainId,
      );

      if (currentNetworkConfig) {
        elements.networkLogo.src = currentNetworkConfig.icon;
        elements.networkLogo.title = currentNetworkConfig.name;
        elements.networkLogo.style.display = "block";
      } else {
        elements.networkLogo.style.display = "none";
      }

      elements.wrap.toggleBtn.disabled = !wethAddresses[Number(chainId)];

      if (!currentVault) {
        if (isNetworkSupported) {
          const supportedChainIds = Object.keys(poolContracts);
          const supportedNetworkNames = supportedChainIds
            .map((id) => {
              const config = Object.values(networkConfigs).find(
                (nc) => nc.chainId == id,
              );
              return config ? config.name : null;
            })
            .filter(Boolean);
          const networkListString = supportedNetworkNames.join(", ");
          const message = `Unsupported network for vault. Please switch to: ${networkListString}.`;
          Notification.show(message, "warning");
        }
        isNetworkSupported = false;
        elements.deposit.balance.innerText = "Unsupported Vault";
        elements.redeem.balance.innerText = "";
        elements.deposit.balanceLabel.innerText = "Status:";
        elements.redeem.balanceLabel.innerText = "";
        elements.deposit.toggleBtn.disabled = true;
        elements.redeem.toggleBtn.disabled = true;
        accordions.forEach((acc) => {
          if (acc !== elements.wrap.accordion) {
            acc.classList.remove("open");
            acc.style.maxHeight = null;
          }
        });
        elements.deposit.icon.style.display = "none";
        elements.redeem.icon.style.display = "none";
      } else {
        isNetworkSupported = true;
        elements.deposit.toggleBtn.disabled = false;
        elements.redeem.toggleBtn.disabled = false;
      }

      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      const ethBalance = await provider.getBalance(userAddress);
      const formattedEth = ethers.formatUnits(ethBalance, 18);
      rawBalances.eth = formattedEth;
      elements.wrap.ethBalance.innerText = formatBalance(formattedEth, 9);

      if (currentVault) {
        const vaultContract = new ethers.Contract(
          currentVault.address,
          currentVault.abi,
          signer,
        );

        const assetAddress = await vaultContract.asset();
        const assetAbi = [
          "function balanceOf(address account) view returns (uint256)",
          "function decimals() view returns (uint8)",
          "function symbol() view returns (string)",
        ];
        const assetContract = new ethers.Contract(
          assetAddress,
          assetAbi,
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

        const formattedAsset = ethers.formatUnits(
          rawAssetBalance,
          assetDecimals,
        );
        const formattedShares = ethers.formatUnits(
          rawSharesBalance,
          sharesDecimals,
        );

        rawBalances.asset = formattedAsset;
        rawBalances.shares = formattedShares;

        elements.deposit.balance.innerText = formatBalance(formattedAsset, 9);
        elements.redeem.balance.innerText = formatBalance(formattedShares, 9);
        elements.wrap.wethBalance.innerText = formatBalance(formattedAsset, 9);

        elements.deposit.balanceLabel.innerText = `${assetSymbol}:`;
        elements.deposit.input.placeholder = `Enter ${assetSymbol} amount`;
        elements.deposit.executeBtn.innerText = `Deposit ${assetSymbol}`;

        elements.redeem.balanceLabel.innerText = `${vaultSymbol}:`;
        elements.redeem.input.placeholder = `Enter ${vaultSymbol} amount`;
        elements.redeem.executeBtn.innerText = `Redeem ${vaultSymbol}`;

        const assetIconUrl = tokenIconMap[assetSymbol];
        if (assetIconUrl) {
          elements.deposit.icon.src = assetIconUrl;
          elements.deposit.icon.style.display = "block";
        } else {
          elements.deposit.icon.style.display = "none";
        }

        const vaultIconUrl = tokenIconMap[vaultSymbol];
        if (vaultIconUrl) {
          elements.redeem.icon.src = vaultIconUrl;
          elements.redeem.icon.style.display = "block";
        } else {
          elements.redeem.icon.style.display = "none";
        }
      }
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

  elements.wrap.maxEthBtn.addEventListener("click", () => {
    const gasReserve = 0.001;
    const maxEth = parseFloat(rawBalances.eth) - gasReserve;
    elements.wrap.input.value = maxEth > 0 ? maxEth.toString() : "0";
  });

  elements.wrap.maxWethBtn.addEventListener("click", () => {
    elements.wrap.input.value = rawBalances.asset;
  });

  async function executeTransaction(action) {
    const provider = wallet.getEthersProvider();
    if (!provider) throw new Error("Could not get wallet provider.");
    const chainId = await wallet.getChainId();
    const signer = await provider.getSigner();

    const networkName = Object.keys(wallet.networkConfigs).find(
      (n) => wallet.networkConfigs[n].chainId === chainId,
    );
    const rpcUrl = getRpcUrl(networkName);

    if (action === "wrap" || action === "unwrap") {
      const wethAddress = wethAddresses[chainId];
      if (!wethAddress) throw new Error("WETH not available on this network.");
      const wethContract = new ethers.Contract(wethAddress, wethAbi, signer);
      const amount = elements.wrap.input.value;
      if (!amount) throw new Error("Please enter an amount.");
      const amountInWei = ethers.parseEther(amount);

      if (action === "wrap") {
        const tx = await wethContract.deposit({ value: amountInWei });
        Notification.track(tx.hash, chainId, rpcUrl, {
          label: "Wrapping ETH",
        });
      } else {
        const tx = await wethContract.withdraw(amountInWei);
        Notification.track(tx.hash, chainId, rpcUrl, {
          label: "Unwrapping WETH",
        });
      }
      elements.wrap.input.value = "";
    } else {
      const currentVault = getCurrentVaultContract(chainId);
      if (!currentVault)
        throw new Error("Unsupported network for this action.");
      const vaultContract = new ethers.Contract(
        currentVault.address,
        currentVault.abi,
        signer,
      );
      const receiver = await signer.getAddress();

      if (action === "deposit") {
        const amount = elements.deposit.input.value;
        if (!amount) throw new Error("Please enter an amount.");
        const assetAddress = await vaultContract.asset();
        const assetContract = new ethers.Contract(
          assetAddress,
          [
            "function approve(address, uint256) returns (bool)",
            "function allowance(address, address) view returns (uint256)",
            "function decimals() view returns (uint8)",
          ],
          signer,
        );
        const assetDecimals = await assetContract.decimals();
        const amountInWei = ethers.parseUnits(amount, assetDecimals);
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
        elements.deposit.input.value = "";
      } else if (action === "redeem") {
        const amount = elements.redeem.input.value;
        if (!amount)
          throw new Error("Please enter an amount of shares to redeem.");
        const sharesDecimals = await vaultContract.decimals();
        const sharesAmount = ethers.parseUnits(amount, sharesDecimals);
        const owner = await signer.getAddress();
        const tx = await vaultContract.redeem(sharesAmount, receiver, owner);
        Notification.track(tx.hash, chainId, rpcUrl, {
          label: "Redeeming Shares",
        });
      }
      elements.redeem.input.value = "";
    }
    updateBalances();
  }

  elements.deposit.executeBtn.addEventListener("click", () => {
    executeTransaction("deposit").catch((err) =>
      Notification.show(err.reason || err.message, "danger"),
    );
  });

  elements.redeem.executeBtn.addEventListener("click", () => {
    executeTransaction("redeem").catch((err) =>
      Notification.show(err.reason || err.message, "danger"),
    );
  });

  elements.wrap.wrapBtn.addEventListener("click", () => {
    executeTransaction("wrap").catch((err) =>
      Notification.show(err.reason || err.message, "danger"),
    );
  });

  elements.wrap.unwrapBtn.addEventListener("click", () => {
    executeTransaction("unwrap").catch((err) =>
      Notification.show(err.reason || err.message, "danger"),
    );
  });

  updateBalances();
});
