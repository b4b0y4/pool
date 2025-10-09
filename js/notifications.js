import { ethers } from "./libs/ethers.min.js";
import { networkConfigs } from "./connect-config.js";

export default class Notification {
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
