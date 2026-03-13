# 📖 SmartClaw Installation Guide

## 🍎 macOS Installation

### Step 1: Download

Download the latest DMG file from [GitHub Releases](https://github.com/nigel201611/SmartClaw/releases):
- `SmartClaw-1.0.0-mac-x64.dmg` (Intel Macs)
- `SmartClaw-1.0.0-mac-arm64.dmg` (Apple Silicon M1/M2/M3)

### Step 2: Install

1. **Open the DMG file** by double-clicking it
2. **Drag SmartClaw** to the Applications folder
3. **Eject the DMG** after copying

### Step 3: First Launch (Important!)

Since SmartClaw v1.0.0 is not yet code-signed, macOS will show a security warning.

**To bypass the warning:**

#### Method 1: Right-Click to Open
1. Open **Finder** → **Applications**
2. **Right-click** (or Control+click) on **SmartClaw.app**
3. Select **"Open"** from the context menu
4. Click **"Open"** in the security dialog
5. ✅ App will launch and remember this exception

#### Method 2: System Preferences
1. Try to open SmartClaw normally
2. When warning appears, click "OK"
3. Go to **System Preferences** → **Security & Privacy** → **General**
4. Click **"Open Anyway"** next to the SmartClaw message
5. Enter your password if prompted
6. ✅ App will launch

### Step 4: Setup Wizard

On first launch, SmartClaw will automatically show the setup wizard:

1. **Matrix Server Configuration**
   - Server URL (default: `http://matrix-local.hiclaw.io:18080`)
   - Your User ID (e.g., `@username:matrix-local.hiclaw.io:18080`)
   - Access Token (from your Matrix server)

2. **AI Gateway Configuration**
   - Gateway URL (default: `http://127.0.0.1:8001`)
   - AI Model (choose from dropdown)

3. **Review & Complete**
   - Review your settings
   - Click "Complete Setup"

4. ✅ **Done!** SmartClaw main window opens

---

## 🪟 Windows Installation

### Step 1: Download

Download `SmartClaw-1.0.0-win-x64.exe` from [GitHub Releases](https://github.com/nigel201611/SmartClaw/releases)

### Step 2: Install

1. **Run the installer** by double-clicking the `.exe` file
2. **Follow the installation wizard**:
   - Choose installation directory
   - Create desktop shortcut (optional)
   - Create Start Menu shortcut (optional)
3. **Click "Install"**
4. ✅ **Launch SmartClaw** after installation completes

### Step 3: Setup Wizard

Follow the same setup wizard as macOS (see above)

---

## 🐧 Linux Installation

### Option A: AppImage (Recommended)

**Step 1: Download**
Download `SmartClaw-1.0.0-linux-x64.AppImage`

**Step 2: Make Executable**
```bash
chmod +x SmartClaw-1.0.0-linux-x64.AppImage
```

**Step 3: Run**
```bash
./SmartClaw-1.0.0-linux-x64.AppImage
```

**Optional: Integrate with System**
```bash
# Install appimaged for automatic integration
sudo systemctl --user enable --now appimaged

# Or manually create .desktop file
mkdir -p ~/.local/share/applications
cp SmartClaw-1.0.0-linux-x64.AppImage ~/.local/bin/
```

### Option B: Debian/Ubuntu Package

**Step 1: Download**
Download `SmartClaw-1.0.0-linux-x64.deb`

**Step 2: Install**
```bash
sudo dpkg -i SmartClaw-1.0.0-linux-x64.deb
```

**Step 3: Fix Dependencies (if needed)**
```bash
sudo apt-get install -f
```

**Step 4: Launch**
Find SmartClaw in your applications menu or run:
```bash
smartclaw
```

---

## ❓ FAQ

### "SmartClaw.app can't be opened because Apple cannot check it for malicious software"

**This is normal for v1.0.0 (Quick Release without code signing).**

**Solution:** Use Method 1 or Method 2 described in "Step 3: First Launch" above.

**Why does this happen?**
- macOS requires all apps to be "notarized" by Apple
- Notarization requires an Apple Developer ID ($99/year)
- SmartClaw v1.0.0 uses "Quick Release" without notarization
- Future versions will be notarized

### "The file is damaged and can't be opened"

**Solution:**
```bash
# Remove quarantine attribute
xattr -cr /Applications/SmartClaw.app
```

Then try opening again with right-click → Open.

### Setup wizard doesn't appear on first launch

**Solution:**
1. Delete the config file:
   ```bash
   rm ~/Library/Application\ Support/SmartClaw/config.json
   ```
2. Relaunch SmartClaw

### I want to change settings later

**Solution:**
1. Click the **⚙️ Settings** button in the sidebar
2. Adjust your preferences
3. Click **"Save Settings"**

---

## 🔐 Security Notes

### About Quick Release (v1.0.0)

SmartClaw v1.0.0 is released as a **Quick Release** without code signing to provide immediate access to users.

**What this means:**
- ✅ Fully functional
- ✅ No malware (open source, auditable)
- ⚠️ macOS shows security warnings
- ⚠️ Requires manual override on first launch

**Future releases (v1.1.0+):**
- ✅ Code signed with Apple Developer ID
- ✅ Notarized by Apple
- ✅ No security warnings
- ✅ Automatic updates

### Data Security

- **Credentials:** Encrypted with AES-256-CBC
- **Storage:** Local only (your device)
- **Transmission:** HTTPS/TLS encrypted
- **Privacy:** No data collection, no telemetry

---

## 📞 Support

**Having trouble?**

- **GitHub Issues:** https://github.com/nigel201611/SmartClaw/issues
- **Documentation:** https://github.com/nigel201611/SmartClaw#readme
- **Community:** [Link to Discord/Matrix room]

---

**Last Updated:** 2026-03-12  
**Version:** 1.0.0
