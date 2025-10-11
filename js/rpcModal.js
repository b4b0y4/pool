import { networkConfigs } from "./connect-config.js";

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
