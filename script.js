/**
 * BlueForce - Bluetooth Manager
 * Script principal pour la gestion des connexions Bluetooth BLE
 */

// ============================================
// Variables globales
// ============================================
let bluetoothDevice = null;
let deviceConnected = false;

// Éléments DOM
const iosWarning = document.getElementById("iosWarning");
const notSupportedWarning = document.getElementById("notSupportedWarning");
const bluetoothControls = document.getElementById("bluetoothControls");
const scanBtn = document.getElementById("scanBtn");
const disconnectBtn = document.getElementById("disconnectBtn");
const statusIndicator = document.getElementById("statusIndicator");
const statusText = document.getElementById("statusText");
const deviceInfo = document.getElementById("deviceInfo");
const deviceName = document.getElementById("deviceName");
const deviceId = document.getElementById("deviceId");
const deviceTypeSpan = document.getElementById("deviceType");
const loadingSpinner = document.getElementById("loadingSpinner");
const toastContainer = document.getElementById("toastContainer");

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
  disconnectBtn.addEventListener("click", disconnectDevice);
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
  bluetoothControls.classList.remove("hidden");
  showToast("✅ Bluetooth disponible sur cet appareil", "success");
}

// ============================================
// Scanner les appareils Bluetooth
// ============================================
async function scanForDevices() {
  try {
    // Désactiver le bouton pendant le scan
    scanBtn.disabled = true;
    loadingSpinner.classList.remove("hidden");

    showToast("🔍 Recherche d'appareils Bluetooth...", "info");

    // Options de scan (accepter tous les appareils BLE)
    const options = {
      // acceptAllDevices: true permet de voir tous les appareils
      acceptAllDevices: true,
      optionalServices: ["battery_service", "device_information"],
    };

    // Alternative : filtrer par nom ou service
    // const options = {
    //     filters: [
    //         { name: 'Mon Appareil' },
    //         { services: ['battery_service'] },
    //         { namePrefix: 'BLE' }
    //     ]
    // };

    // Demander à l'utilisateur de sélectionner un appareil
    bluetoothDevice = await navigator.bluetooth.requestDevice(options);

    // Écouter la déconnexion
    bluetoothDevice.addEventListener("gattserverdisconnected", onDisconnected);

    // Se connecter au serveur GATT
    await connectToDevice(bluetoothDevice);
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

    // Succès !
    deviceConnected = true;
    updateUIConnected(device);

    showToast(`✅ Connecté à ${device.name || "Appareil inconnu"}`, "success");

    // Optionnel : lire des services/caractéristiques
    // await readDeviceServices(server);
  } catch (error) {
    showToast("❌ Erreur lors de la connexion", "error");
    console.error("Erreur de connexion:", error);
  }
}

// ============================================
// Lecture des services (optionnel)
// ============================================
async function readDeviceServices(server) {
  try {
    // Exemple : lire le niveau de batterie si disponible
    const batteryService = await server.getPrimaryService("battery_service");
    const batteryLevel = await batteryService.getCharacteristic(
      "battery_level"
    );
    const value = await batteryLevel.readValue();
    const battery = value.getUint8(0);

    showToast(`🔋 Batterie: ${battery}%`, "info");
  } catch (error) {
    // Service non disponible, ce n'est pas grave
    console.log("Service batterie non disponible");
  }
}

// ============================================
// Déconnexion
// ============================================
function disconnectDevice() {
  if (bluetoothDevice && bluetoothDevice.gatt.connected) {
    bluetoothDevice.gatt.disconnect();
    showToast("🔴 Déconnexion en cours...", "info");
  } else {
    showToast("⚠️ Aucun appareil connecté", "error");
  }
}

// ============================================
// Événement de déconnexion
// ============================================
function onDisconnected(event) {
  deviceConnected = false;
  updateUIDisconnected();
  showToast("🔴 Appareil déconnecté", "info");

  // Réinitialiser la variable
  bluetoothDevice = null;
}

// ============================================
// Mise à jour de l'interface (connecté)
// ============================================
function updateUIConnected(device) {
  // Mettre à jour le statut
  statusText.textContent = `Connecté à ${device.name || "Appareil inconnu"}`;
  statusIndicator.querySelector(".pulse").classList.add("connected");

  // Afficher les infos de l'appareil
  deviceName.textContent = device.name || "Appareil inconnu";
  deviceId.textContent = device.id || "N/A";
  deviceInfo.classList.remove("hidden");

  // Afficher le bouton de déconnexion
  disconnectBtn.classList.remove("hidden");
  scanBtn.textContent = "🔄 Scanner un autre appareil";
}

// ============================================
// Mise à jour de l'interface (déconnecté)
// ============================================
function updateUIDisconnected() {
  // Mettre à jour le statut
  statusText.textContent = "Aucun appareil connecté";
  statusIndicator.querySelector(".pulse").classList.remove("connected");

  // Masquer les infos de l'appareil
  deviceInfo.classList.add("hidden");

  // Masquer le bouton de déconnexion
  disconnectBtn.classList.add("hidden");
  scanBtn.textContent = "🔍 Scanner les appareils Bluetooth";
}

// ============================================
// Gestion des erreurs Bluetooth
// ============================================
function handleBluetoothError(error) {
  console.error("Erreur Bluetooth:", error);

  if (error.name === "NotFoundError") {
    showToast("ℹ️ Aucun appareil sélectionné", "info");
  } else if (error.name === "SecurityError") {
    showToast("🔒 Erreur de sécurité - HTTPS requis", "error");
  } else if (error.name === "NotSupportedError") {
    showToast("⚠️ Fonction non supportée par cet appareil", "error");
  } else if (error.name === "NetworkError") {
    showToast("📡 Erreur de connexion réseau Bluetooth", "error");
  } else {
    showToast(`❌ Erreur: ${error.message}`, "error");
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

// ============================================
// Gestion de la reconnexion automatique (optionnel)
// ============================================
async function reconnectToDevice() {
  if (bluetoothDevice) {
    try {
      showToast("🔄 Tentative de reconnexion...", "info");
      await bluetoothDevice.gatt.connect();
      updateUIConnected(bluetoothDevice);
      showToast("✅ Reconnecté avec succès", "success");
    } catch (error) {
      showToast("❌ Échec de la reconnexion", "error");
    }
  }
}

// Optionnel : bouton de reconnexion
// disconnectBtn.addEventListener('dblclick', reconnectToDevice);
