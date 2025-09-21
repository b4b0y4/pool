export default class NotificationSystem {
  static container = null;
  static notifications = new Map();
  static idCounter = 0;

  static init() {
    if (!this.container) {
      this.container = document.getElementById("notificationContainer");
    }
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
    const notification = this.create(id, message, type, config);

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

  static create(id, message, type, config) {
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
        ${
          config.showProgress && config.duration > 0
            ? `<div class="progress-bar" style="animation-duration: ${config.duration}ms"></div>`
            : ""
        }
      </div>
    `;

    if (config.closable) {
      notification
        .querySelector(".notif-close")
        .addEventListener("click", () => this.hide(id));
    }

    return notification;
  }

  static hide(id) {
    const notif = this.notifications.get(id);
    if (!notif) return;

    if (notif.timeoutId) {
      clearTimeout(notif.timeoutId);
    }

    notif.element.classList.add("hide");

    setTimeout(() => {
      if (notif.element.parentNode) {
        notif.element.parentNode.removeChild(notif.element);
      }
      this.notifications.delete(id);
    }, 400);
  }

  static scheduleHide(id, delay) {
    const notif = this.notifications.get(id);
    if (notif) {
      notif.timeoutId = setTimeout(() => this.hide(id), delay);
    }
  }

  static escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}
