/**
 * BlueForce - Bluetooth Manager
 * Script principal pour la gestion des connexions Bluetooth BLE
 */

// ============================================
// Variables globales
// ============================================
let connectedDevices = new Map(); // Map pour stocker plusieurs appareils connectés
let deviceHistory = []; // Historique des appareils
let detectedDevices = new Map(); // Appareils détectés en mode avancé
let isScanning = false; // État du scan
let scanAbortController = null; // Contrôleur pour arrêter le scan
let currentMode = "basic"; // Mode actuel (basic ou advanced)

// Éléments DOM
const iosWarning = document.getElementById("iosWarning");
const notSupportedWarning = document.getElementById("notSupportedWarning");
const modeToggle = document.getElementById("modeToggle");
const basicModeBtn = document.getElementById("basicModeBtn");
const advancedModeBtn = document.getElementById("advancedModeBtn");
const modeDescription = document.getElementById("modeDescription");
const bluetoothControls = document.getElementById("bluetoothControls");
const advancedScan = document.getElementById("advancedScan");
const scanBtn = document.getElementById("scanBtn");
const startScanBtn = document.getElementById("startScanBtn");
const stopScanBtn = document.getElementById("stopScanBtn");
const deviceTypeSpan = document.getElementById("deviceType");
const loadingSpinner = document.getElementById("loadingSpinner");
const toastContainer = document.getElementById("toastContainer");
const bluefyBtn = document.getElementById("bluefyBtn");
const connectedDevicesSection = document.getElementById("connectedDevices");
const devicesList = document.getElementById("devicesList");
const deviceCount = document.getElementById("deviceCount");
const deviceHistorySection = document.getElementById("deviceHistory");
const historyList = document.getElementById("historyList");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const detectedDevicesSection = document.getElementById("detectedDevices");
const detectedList = document.getElementById("detectedList");
const detectedCount = document.getElementById("detectedCount");

// ============================================
// Détection du type d'appareil
// ============================================
const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
const isAndroid = /Android/i.test(navigator.userAgent);
const isMacOS = /Macintosh|MacIntel|MacPPC|Mac68K/i.test(navigator.userAgent);
const isWindows = /Win32|Win64|Windows|WinCE/i.test(navigator.userAgent);

// Détection du navigateur
const isChrome =
  /Chrome/i.test(navigator.userAgent) && /Google Inc/i.test(navigator.vendor);
const isSafari =
  /Safari/i.test(navigator.userAgent) &&
  /Apple Computer/i.test(navigator.vendor);
const isEdge = /Edg/i.test(navigator.userAgent);

// ============================================
// Fonction d'initialisation
// ============================================
function init() {
  // Afficher le type d'appareil détecté
  let deviceType = "Inconnu";

  if (isIOS) {
    deviceType = "📱 iOS (iPhone/iPad)";
  } else if (isAndroid) {
    deviceType = "🤖 Android";
  } else if (isMacOS) {
    deviceType = "💻 macOS";
  } else if (isWindows) {
    deviceType = "🖥️ Windows";
  }

  deviceTypeSpan.textContent = deviceType;

  // Vérifier la disponibilité de l'API Bluetooth
  checkBluetoothSupport();

  // Ajouter les event listeners
  scanBtn.addEventListener("click", scanForDevices);

  // Mode Toggle
  if (basicModeBtn) {
    basicModeBtn.addEventListener("click", () => switchMode("basic"));
  }
  if (advancedModeBtn) {
    advancedModeBtn.addEventListener("click", () => switchMode("advanced"));
  }

  // Mode avancé
  if (startScanBtn) {
    startScanBtn.addEventListener("click", startAdvancedScan);
  }
  if (stopScanBtn) {
    stopScanBtn.addEventListener("click", stopAdvancedScan);
  }

  // Gérer le bouton Bluefy pour iOS
  if (bluefyBtn) {
    bluefyBtn.addEventListener("click", openInBluefy);
  }

  // Gérer l'historique
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener("click", clearHistory);
  }

  // Charger l'historique depuis le localStorage
  loadHistoryFromStorage();
  updateUI();
}

// ============================================
// Vérification du support Bluetooth
// ============================================
function checkBluetoothSupport() {
  // Cas spécial : iOS avec Safari (pas de support Bluetooth)
  if (isIOS && !navigator.bluetooth) {
    iosWarning.classList.remove("hidden");
    bluetoothControls.classList.add("hidden");
    showToast("⚠️ Bluetooth non supporté sur Safari iOS", "error");
    return;
  }

  // Vérifier si l'API Bluetooth est disponible
  if (!navigator.bluetooth) {
    notSupportedWarning.classList.remove("hidden");
    bluetoothControls.classList.add("hidden");
    showToast(
      "⚠️ Votre navigateur ne supporte pas le Bluetooth Web API",
      "error"
    );
    return;
  }

  // Si tout est OK, afficher les contrôles
  modeToggle.classList.remove("hidden");
  bluetoothControls.classList.remove("hidden");
  showToast("✅ Bluetooth disponible sur cet appareil", "success");
}

// ============================================
// Basculer entre les modes
// ============================================
function switchMode(mode) {
  currentMode = mode;

  // Mettre à jour les boutons
  if (mode === "basic") {
    basicModeBtn.classList.add("active");
    advancedModeBtn.classList.remove("active");
    bluetoothControls.classList.remove("hidden");
    advancedScan.classList.add("hidden");
    modeDescription.textContent =
      "Mode basique : Ajoutez des appareils un par un";

    // Arrêter le scan si actif
    if (isScanning) {
      stopAdvancedScan();
    }
  } else {
    basicModeBtn.classList.remove("active");
    advancedModeBtn.classList.add("active");
    bluetoothControls.classList.add("hidden");
    advancedScan.classList.remove("hidden");
    modeDescription.textContent =
      "Mode avancé : Scannez tous les appareils en temps réel";
  }

  showToast(
    `🔄 Basculé en mode ${mode === "basic" ? "basique" : "avancé"}`,
    "info"
  );
}

// ============================================
// Mode Avancé - Scan en temps réel
// ============================================
async function startAdvancedScan() {
  // Vérifier si l'API de scan est disponible
  if (!navigator.bluetooth || !navigator.bluetooth.requestLEScan) {
    showToast(
      "⚠️ Le scan Bluetooth avancé n'est pas supporté sur ce navigateur. Essayez Chrome avec le flag experimental-web-platform-features activé.",
      "error"
    );
    return;
  }

  try {
    startScanBtn.disabled = true;

    // Créer un AbortController pour pouvoir arrêter le scan
    scanAbortController = new AbortController();

    showToast("📡 Démarrage du scan Bluetooth...", "info");

    // Demander la permission de scanner
    const scan = await navigator.bluetooth.requestLEScan({
      acceptAllAdvertisements: true,
    });

    isScanning = true;
    startScanBtn.classList.add("hidden");
    stopScanBtn.classList.remove("hidden");
    detectedDevicesSection.classList.remove("hidden");

    // Écouter les advertisements
    navigator.bluetooth.addEventListener(
      "advertisementreceived",
      handleAdvertisement,
      { signal: scanAbortController.signal }
    );

    showToast(
      "✅ Scan actif - Les appareils apparaissent en temps réel",
      "success"
    );

    // Nettoyer les anciens appareils toutes les 10 secondes
    const cleanupInterval = setInterval(() => {
      if (!isScanning) {
        clearInterval(cleanupInterval);
        return;
      }
      cleanupOldDevices();
    }, 10000);
  } catch (error) {
    handleBluetoothError(error);
    startScanBtn.disabled = false;
  }
}

function stopAdvancedScan() {
  if (scanAbortController) {
    scanAbortController.abort();
    scanAbortController = null;
  }

  isScanning = false;
  startScanBtn.classList.remove("hidden");
  stopScanBtn.classList.add("hidden");
  startScanBtn.disabled = false;

  // Nettoyer la liste
  detectedDevices.clear();
  updateDetectedDevicesUI();

  showToast("⏹️ Scan arrêté", "info");
}

function handleAdvertisement(event) {
  const device = event.device;
  const rssi = event.rssi;

  // Mettre à jour ou ajouter l'appareil
  detectedDevices.set(device.id, {
    device: device,
    name: device.name || "Appareil inconnu",
    id: device.id,
    rssi: rssi,
    lastSeen: Date.now(),
  });

  updateDetectedDevicesUI();
}

function cleanupOldDevices() {
  const now = Date.now();
  const timeout = 15000; // 15 secondes

  detectedDevices.forEach((deviceData, deviceId) => {
    if (now - deviceData.lastSeen > timeout) {
      detectedDevices.delete(deviceId);
    }
  });

  updateDetectedDevicesUI();
}

function updateDetectedDevicesUI() {
  detectedCount.textContent = detectedDevices.size;
  detectedList.innerHTML = "";

  if (detectedDevices.size === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `
      <div class="empty-state-icon">📡</div>
      <div class="empty-state-text">Aucun appareil détecté pour le moment...</div>
    `;
    detectedList.appendChild(empty);
    return;
  }

  // Trier par signal (RSSI)
  const sortedDevices = Array.from(detectedDevices.values()).sort(
    (a, b) => b.rssi - a.rssi
  );

  sortedDevices.forEach((deviceData) => {
    const card = createDetectedDeviceCard(deviceData);
    detectedList.appendChild(card);
  });
}

function createDetectedDeviceCard(deviceData) {
  const card = document.createElement("div");
  card.className = "detected-card";

  // Indicateur de signal
  const signalIndicator = document.createElement("div");
  signalIndicator.className = "signal-indicator";

  const signalBars = document.createElement("div");
  signalBars.className = "signal-bars";

  // Calculer le nombre de barres actives (RSSI: -100 à -30 dBm)
  const signalStrength = Math.max(
    0,
    Math.min(4, Math.floor((deviceData.rssi + 100) / 17.5))
  );

  for (let i = 0; i < 4; i++) {
    const bar = document.createElement("div");
    bar.className = `signal-bar ${i < signalStrength ? "active" : ""}`;
    signalBars.appendChild(bar);
  }

  const signalValue = document.createElement("div");
  signalValue.className = "signal-value";
  signalValue.textContent = `${deviceData.rssi} dBm`;

  signalIndicator.appendChild(signalBars);
  signalIndicator.appendChild(signalValue);

  // Icône
  const icon = document.createElement("div");
  icon.className = "device-icon";
  icon.textContent = "📱";

  // Détails
  const details = document.createElement("div");
  details.className = "device-details";

  const name = document.createElement("div");
  name.className = "device-name";
  name.textContent = deviceData.name;

  const id = document.createElement("div");
  id.className = "device-id";
  id.textContent = deviceData.id;

  details.appendChild(name);
  details.appendChild(id);

  // Bouton de connexion
  const actions = document.createElement("div");
  actions.className = "device-actions";

  const connectBtn = document.createElement("button");
  connectBtn.className = "btn-small btn-reconnect";
  connectBtn.textContent = "🔗 Connecter";
  connectBtn.onclick = () => connectToDetectedDevice(deviceData);

  actions.appendChild(connectBtn);

  card.appendChild(signalIndicator);
  card.appendChild(icon);
  card.appendChild(details);
  card.appendChild(actions);

  return card;
}

async function connectToDetectedDevice(deviceData) {
  try {
    // Vérifier si déjà connecté
    if (connectedDevices.has(deviceData.id)) {
      showToast(`⚠️ ${deviceData.name} est déjà connecté`, "info");
      return;
    }

    showToast("🔗 Connexion en cours...", "info");

    // Utiliser l'API standard pour se connecter (la popup s'ouvrira quand même)
    const options = {
      filters: [{ name: deviceData.name }],
      optionalServices: [
        "battery_service",
        "device_information",
        "generic_access",
        "0000180a-0000-1000-8000-00805f9b34fb",
        "00001800-0000-1000-8000-00805f9b34fb",
      ],
    };

    // Si le nom est "Appareil inconnu", on utilise acceptAllDevices
    if (deviceData.name === "Appareil inconnu") {
      delete options.filters;
      options.acceptAllDevices = true;
    }

    const device = await navigator.bluetooth.requestDevice(options);

    device.addEventListener("gattserverdisconnected", () =>
      onDisconnected(device.id)
    );

    await connectToDevice(device);
  } catch (error) {
    handleBluetoothError(error);
  }
}

// ============================================
// Scanner les appareils Bluetooth (Mode Basique)
// ============================================
async function scanForDevices() {
  try {
    // Désactiver le bouton pendant le scan
    scanBtn.disabled = true;
    loadingSpinner.classList.remove("hidden");

    showToast("🔍 Sélectionnez un appareil Bluetooth...", "info");

    // Options de scan (accepter tous les appareils BLE)
    const options = {
      acceptAllDevices: true,
      optionalServices: [
        "battery_service",
        "device_information",
        "generic_access",
        "0000180a-0000-1000-8000-00805f9b34fb", // Device Information
        "00001800-0000-1000-8000-00805f9b34fb", // Generic Access
      ],
    };

    // Demander à l'utilisateur de sélectionner un appareil
    const device = await navigator.bluetooth.requestDevice(options);

    // Vérifier si l'appareil est déjà connecté
    if (connectedDevices.has(device.id)) {
      showToast(
        `⚠️ ${device.name || "Cet appareil"} est déjà connecté`,
        "info"
      );
      return;
    }

    // Écouter la déconnexion
    device.addEventListener("gattserverdisconnected", () =>
      onDisconnected(device.id)
    );

    // Se connecter au serveur GATT
    await connectToDevice(device);
  } catch (error) {
    handleBluetoothError(error);
  } finally {
    // Réactiver le bouton et masquer le spinner
    scanBtn.disabled = false;
    loadingSpinner.classList.add("hidden");
  }
}

// ============================================
// Connexion à un appareil
// ============================================
async function connectToDevice(device) {
  try {
    showToast("🔗 Connexion en cours...", "info");

    // Connexion au serveur GATT
    const server = await device.gatt.connect();

    // Essayer de récupérer le nom réel de l'appareil
    let realName = device.name || "Appareil inconnu";
    try {
      const service = await server.getPrimaryService("generic_access");
      const characteristic = await service.getCharacteristic("gap.device_name");
      const value = await characteristic.readValue();
      const decoder = new TextDecoder("utf-8");
      const name = decoder.decode(value);
      if (name) realName = name;
    } catch (e) {
      // Nom générique non disponible, on garde le nom BLE
    }

    // Stocker l'appareil connecté
    connectedDevices.set(device.id, {
      device: device,
      server: server,
      name: realName,
      id: device.id,
      connectedAt: new Date(),
    });

    // Ajouter à l'historique
    addToHistory(device.id, realName);

    // Mettre à jour l'interface
    updateUI();

    showToast(`✅ Connecté à ${realName}`, "success");
  } catch (error) {
    showToast("❌ Erreur lors de la connexion", "error");
    console.error("Erreur de connexion:", error);
  }
}

// ============================================
// Déconnexion d'un appareil
// ============================================
function disconnectDevice(deviceId) {
  const deviceData = connectedDevices.get(deviceId);

  if (deviceData && deviceData.device.gatt.connected) {
    deviceData.device.gatt.disconnect();
    showToast(`🔴 Déconnexion de ${deviceData.name}...`, "info");
  } else {
    connectedDevices.delete(deviceId);
    updateUI();
  }
}

// ============================================
// Événement de déconnexion
// ============================================
function onDisconnected(deviceId) {
  const deviceData = connectedDevices.get(deviceId);

  if (deviceData) {
    showToast(`🔴 ${deviceData.name} déconnecté`, "info");
    connectedDevices.delete(deviceId);
    updateUI();
  }
}

// ============================================
// Mise à jour de l'interface
// ============================================
function updateUI() {
  // Mettre à jour le compteur
  deviceCount.textContent = connectedDevices.size;

  // Afficher/masquer la section des appareils connectés
  if (connectedDevices.size > 0) {
    connectedDevicesSection.classList.remove("hidden");
    renderConnectedDevices();
  } else {
    connectedDevicesSection.classList.add("hidden");
  }

  // Afficher/masquer l'historique
  if (deviceHistory.length > 0) {
    deviceHistorySection.classList.remove("hidden");
    renderHistory();
  } else {
    deviceHistorySection.classList.add("hidden");
  }
}

// ============================================
// Afficher les appareils connectés
// ============================================
function renderConnectedDevices() {
  devicesList.innerHTML = "";

  connectedDevices.forEach((deviceData, deviceId) => {
    const card = createDeviceCard(deviceData, true);
    devicesList.appendChild(card);
  });
}

// ============================================
// Créer une carte d'appareil
// ============================================
function createDeviceCard(deviceData, isConnected = false) {
  const card = document.createElement("div");
  card.className = `device-card ${isConnected ? "connected" : ""}`;

  const icon = document.createElement("div");
  icon.className = "device-icon";
  icon.textContent = "📱";

  const details = document.createElement("div");
  details.className = "device-details";

  const name = document.createElement("div");
  name.className = "device-name";
  name.textContent = deviceData.name;

  const id = document.createElement("div");
  id.className = "device-id";
  id.textContent = deviceData.id;

  details.appendChild(name);
  details.appendChild(id);

  if (isConnected) {
    const status = document.createElement("div");
    status.className = "device-status";
    status.textContent = "Connecté";
    details.appendChild(status);
  }

  const actions = document.createElement("div");
  actions.className = "device-actions";

  if (isConnected) {
    const disconnectBtn = document.createElement("button");
    disconnectBtn.className = "btn-small btn-disconnect";
    disconnectBtn.textContent = "❌ Déconnecter";
    disconnectBtn.onclick = () => disconnectDevice(deviceData.id);
    actions.appendChild(disconnectBtn);
  } else {
    const reconnectBtn = document.createElement("button");
    reconnectBtn.className = "btn-small btn-reconnect";
    reconnectBtn.textContent = "🔄 Reconnecter";
    reconnectBtn.onclick = () => {
      showToast(
        "ℹ️ Utilisez le bouton 'Ajouter un appareil' pour reconnecter",
        "info"
      );
    };
    actions.appendChild(reconnectBtn);
  }

  card.appendChild(icon);
  card.appendChild(details);
  card.appendChild(actions);

  return card;
}

// ============================================
// Gestion de l'historique
// ============================================
function addToHistory(deviceId, deviceName) {
  // Éviter les doublons
  const existing = deviceHistory.findIndex((d) => d.id === deviceId);
  if (existing !== -1) {
    deviceHistory.splice(existing, 1);
  }

  // Ajouter en début de liste
  deviceHistory.unshift({
    id: deviceId,
    name: deviceName,
    lastConnected: new Date().toISOString(),
  });

  // Limiter à 10 appareils
  if (deviceHistory.length > 10) {
    deviceHistory = deviceHistory.slice(0, 10);
  }

  // Sauvegarder dans le localStorage
  saveHistoryToStorage();
}

function renderHistory() {
  historyList.innerHTML = "";

  // Filtrer l'historique pour ne pas afficher les appareils déjà connectés
  const filteredHistory = deviceHistory.filter(
    (h) => !connectedDevices.has(h.id)
  );

  if (filteredHistory.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `
      <div class="empty-state-icon">📝</div>
      <div class="empty-state-text">Tous les appareils de l'historique sont déjà connectés</div>
    `;
    historyList.appendChild(empty);
    return;
  }

  filteredHistory.forEach((historyItem) => {
    const card = createDeviceCard(historyItem, false);
    historyList.appendChild(card);
  });
}

function saveHistoryToStorage() {
  try {
    localStorage.setItem("blueforce_history", JSON.stringify(deviceHistory));
  } catch (e) {
    console.error("Erreur lors de la sauvegarde de l'historique:", e);
  }
}

function loadHistoryFromStorage() {
  try {
    const stored = localStorage.getItem("blueforce_history");
    if (stored) {
      deviceHistory = JSON.parse(stored);
    }
  } catch (e) {
    console.error("Erreur lors du chargement de l'historique:", e);
    deviceHistory = [];
  }
}

function clearHistory() {
  if (confirm("Voulez-vous vraiment effacer tout l'historique ?")) {
    deviceHistory = [];
    saveHistoryToStorage();
    updateUI();
    showToast("🗑️ Historique effacé", "success");
  }
}

// ============================================
// Ouvrir dans Bluefy (iOS)
// ============================================
function openInBluefy() {
  // Récupérer l'URL actuelle
  const currentUrl = window.location.href;

  // Encoder l'URL pour Bluefy
  const bluefyUrl = `bluefy://openurl?url=${encodeURIComponent(currentUrl)}`;

  // Essayer d'ouvrir Bluefy
  window.location.href = bluefyUrl;

  // Si Bluefy n'est pas installé, afficher le bouton App Store après un délai
  setTimeout(() => {
    // Vérifier si on est toujours sur la page (Bluefy ne s'est pas ouvert)
    const appStoreBtn = document.querySelector(".btn-app-store");
    if (appStoreBtn) {
      bluefyBtn.style.display = "none";
      appStoreBtn.style.display = "inline-flex";
      showToast(
        "📲 Bluefy n'est pas installé. Téléchargez-le depuis l'App Store.",
        "info"
      );
    }
  }, 2000);
}

// ============================================
// Gestion des erreurs Bluetooth
// ============================================
function handleBluetoothError(error) {
  console.error("Erreur Bluetooth:", error);

  if (!error) {
    showToast("❌ Une erreur inconnue s'est produite", "error");
    return;
  }

  if (error.name === "NotFoundError") {
    showToast("ℹ️ Aucun appareil sélectionné", "info");
  } else if (error.name === "SecurityError") {
    showToast("🔒 Erreur de sécurité - HTTPS requis", "error");
  } else if (error.name === "NotSupportedError") {
    showToast("⚠️ Fonction non supportée par cet appareil", "error");
  } else if (error.name === "NetworkError") {
    showToast("📡 Erreur de connexion réseau Bluetooth", "error");
  } else if (error.name === "InvalidStateError") {
    showToast("⚠️ Le Bluetooth n'est pas disponible ou activé", "error");
  } else if (error.name === "NotAllowedError") {
    showToast("🚫 Permission Bluetooth refusée", "error");
  } else {
    const errorMsg = error.message || error.toString() || "Erreur inconnue";
    showToast(`❌ Erreur: ${errorMsg}`, "error");
  }
}

// ============================================
// Système de notifications Toast
// ============================================
function showToast(message, type = "info") {
  // Créer l'élément toast
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  // Icône selon le type
  let icon = "ℹ️";
  if (type === "success") icon = "✅";
  if (type === "error") icon = "❌";
  if (type === "info") icon = "📢";

  // Contenu
  toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-message">${message}</div>
    `;

  // Ajouter au container
  toastContainer.appendChild(toast);

  // Supprimer après 4 secondes
  setTimeout(() => {
    toast.style.animation = "slideIn 0.3s ease-out reverse";
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
}

// ============================================
// PWA - Service Worker (optionnel)
// ============================================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    // Vous pouvez enregistrer un service worker ici si besoin
    // navigator.serviceWorker.register('/sw.js');
  });
}

// ============================================
// Installation PWA
// ============================================
let deferredPrompt;

window.addEventListener("beforeinstallprompt", (e) => {
  // Empêcher l'affichage automatique
  e.preventDefault();
  deferredPrompt = e;

  // Optionnel : afficher un bouton d'installation personnalisé
  showInstallPrompt();
});

function showInstallPrompt() {
  // Créer un élément pour proposer l'installation
  const installPrompt = document.createElement("div");
  installPrompt.className = "install-prompt";
  installPrompt.innerHTML = `
        <p>📱 Installer BlueForce sur votre écran d'accueil ?</p>
        <button id="installBtn">Installer</button>
    `;

  document.querySelector(".container").prepend(installPrompt);

  document.getElementById("installBtn").addEventListener("click", async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        showToast("✅ Application installée !", "success");
      }

      deferredPrompt = null;
      installPrompt.remove();
    }
  });
}

// ============================================
// Démarrage de l'application
// ============================================
document.addEventListener("DOMContentLoaded", init);
