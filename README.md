# 🔵 BlueForce - Gestionnaire Bluetooth BLE

BlueForce est une application web progressive (PWA) moderne qui permet de gérer les connexions Bluetooth Low Energy (BLE) directement depuis votre navigateur, sur mobile et desktop.

## ✨ Fonctionnalités

- 🔍 **Scan automatique** des appareils Bluetooth à proximité
- 🔗 **Connexion/Déconnexion** facile aux périphériques BLE
- 📱 **Détection automatique** du type d'appareil (iOS, Android, Desktop)
- 🌙 **Interface dark moderne** avec thème futuriste bleu/violet
- 📊 **Indicateur de statut** en temps réel
- 🔔 **Notifications toast** pour chaque action
- 💾 **PWA complète** - installable sur l'écran d'accueil
- 🎨 **Design responsive** optimisé pour mobile et desktop

## 📱 Compatibilité

### ✅ Appareils supportés

- **Android** : Chrome, Edge, Opera (Bluetooth natif)
- **Windows/Linux** : Chrome, Edge, Opera
- **macOS** : Chrome, Edge
- **iOS/iPadOS** : Bluefy Browser (app tierce requise)

### ⚠️ Limitations

- Safari iOS ne supporte pas l'API Web Bluetooth
- Nécessite HTTPS en production (sauf localhost)
- Certains services BLE peuvent nécessiter des autorisations spécifiques

## 🚀 Installation & Déploiement

### Option 1 : GitHub Pages (Recommandé)

1. **Créer un nouveau repository GitHub**

   ```bash
   git init
   git add .
   git commit -m "Initial commit - BlueForce"
   git branch -M main
   git remote add origin https://github.com/VOTRE_USERNAME/blueforce.git
   git push -u origin main
   ```

2. **Activer GitHub Pages**

   - Allez dans Settings > Pages
   - Source : `main` branch, `/` (root)
   - Cliquez sur Save
   - Votre site sera accessible à : `https://VOTRE_USERNAME.github.io/blueforce/`

3. **Tester localement avant déploiement**

   ```bash
   # Utiliser un serveur local (HTTPS requis pour Bluetooth)
   # Option 1 : Python
   python -m http.server 8000

   # Option 2 : Node.js (http-server avec SSL)
   npx http-server -S -C cert.pem -K key.pem

   # Option 3 : Live Server (VS Code extension)
   # Installer l'extension "Live Server" et cliquer sur "Go Live"
   ```

### Option 2 : Hébergement local avec certificat SSL

Pour tester Bluetooth en local, vous devez utiliser HTTPS :

```bash
# Générer un certificat auto-signé
openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout key.pem -out cert.pem

# Lancer le serveur HTTPS
npx http-server -S -C cert.pem -K key.pem -p 8443
```

Accédez ensuite à `https://localhost:8443` (acceptez l'avertissement de certificat).

## 📖 Guide d'utilisation

### Sur Android / Chrome Desktop

1. Ouvrez le site dans Chrome
2. Cliquez sur **"Scanner les appareils Bluetooth"**
3. Sélectionnez votre appareil BLE dans la liste
4. Une fois connecté, vous verrez les infos de l'appareil
5. Utilisez **"Déconnecter l'appareil"** pour terminer la connexion

### Sur iPhone / iPad

1. Téléchargez [**Bluefy**](https://apps.apple.com/app/bluefy-web-ble-browser/id1492822055) depuis l'App Store
2. Ouvrez votre site dans Bluefy
3. Suivez les mêmes étapes que sur Android

### Installation sur l'écran d'accueil

- **Android** : Menu Chrome > "Ajouter à l'écran d'accueil"
- **iOS** : Safari > Partager > "Sur l'écran d'accueil" (puis ouvrir avec Bluefy)
- **Desktop** : Icône d'installation dans la barre d'adresse Chrome

## 🔧 Structure du projet

```
BlueForce/
│
├── index.html          # Page principale
├── style.css           # Styles CSS (thème dark futuriste)
├── script.js           # Logique JavaScript + API Bluetooth
├── manifest.json       # Configuration PWA
└── README.md           # Documentation
```

## 🛠️ Technologies utilisées

- **HTML5** - Structure sémantique
- **CSS3** - Animations, gradients, responsive design
- **JavaScript ES6+** - Web Bluetooth API, PWA
- **Web Bluetooth API** - Connexion BLE
- **PWA** - Progressive Web App (manifest, service worker ready)
- **Google Fonts** - Police "Poppins"

## 📡 API Bluetooth - Exemples d'utilisation

### Scanner avec filtre spécifique

Modifiez dans `script.js` la fonction `scanForDevices()` :

```javascript
const options = {
  filters: [
    { name: "MonAppareil" },
    { namePrefix: "ESP32" },
    { services: ["battery_service"] },
  ],
  optionalServices: ["device_information"],
};
```

### Lire une caractéristique

Ajoutez dans la fonction `connectToDevice()` :

```javascript
const service = await server.getPrimaryService("mon_service_uuid");
const characteristic = await service.getCharacteristic(
  "ma_caracteristique_uuid"
);
const value = await characteristic.readValue();
```

### Écrire une valeur

```javascript
const data = new Uint8Array([0x01, 0x02, 0x03]);
await characteristic.writeValue(data);
```

## 🎨 Personnalisation

### Changer les couleurs

Dans `style.css`, modifiez les variables CSS :

```css
:root {
  --accent-blue: #4c6ef5; /* Bleu principal */
  --accent-purple: #7048e8; /* Violet */
  --accent-cyan: #22b8cf; /* Cyan */
}
```

### Modifier le logo

Remplacez l'emoji 🔵 dans `index.html` et `manifest.json` par votre propre icône.

## 🐛 Dépannage

### "Bluetooth non disponible"

- Vérifiez que Bluetooth est activé sur votre appareil
- Assurez-vous d'utiliser HTTPS (ou localhost)
- Utilisez un navigateur compatible (Chrome, Edge, Opera)

### "SecurityError"

- Le site doit être servi en HTTPS
- Sur localhost, HTTP est autorisé pour les tests

### iOS - "Bluetooth non supporté"

- Téléchargez et utilisez l'app **Bluefy**
- Safari iOS ne supporte pas l'API Web Bluetooth nativement

### Aucun appareil détecté

- Assurez-vous que l'appareil BLE est allumé et en mode appairage
- Réduisez la distance entre l'appareil et votre téléphone/ordinateur
- Vérifiez que l'appareil n'est pas déjà connecté ailleurs

## 📄 Licence

Ce projet est libre d'utilisation pour vos projets personnels et commerciaux.

## 🤝 Contribution

N'hésitez pas à forker ce projet, ouvrir des issues ou proposer des pull requests !

## 📞 Support

Pour toute question ou problème :

- Consultez la [documentation Web Bluetooth API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API)
- Vérifiez la [compatibilité des navigateurs](https://caniuse.com/web-bluetooth)

---

Créé avec ❤️ pour la communauté IoT et Bluetooth

**BlueForce** - Votre gestionnaire Bluetooth nouvelle génération 🔵
