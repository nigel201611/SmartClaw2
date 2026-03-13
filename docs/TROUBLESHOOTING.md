# SmartClaw Troubleshooting Guide

Common issues and solutions for SmartClaw.

## Installation Issues

### Windows

**Problem**: "Windows protected your PC" when running installer

**Solution**:
1. Click "More info"
2. Click "Run anyway"
3. This is a false positive - SmartClaw is safe

---

**Problem**: Installer fails with error code

**Solution**:
1. Run installer as Administrator
2. Disable antivirus temporarily
3. Check disk space (need 500MB+)
4. Download installer again (may be corrupted)

---

### macOS

**Problem**: "SmartClaw can't be opened because the developer cannot be verified"

**Solution**:
1. Right-click (or Ctrl+click) the app
2. Select "Open"
3. Click "Open" in the dialog
4. This only needs to be done once

---

**Problem**: App crashes on launch (Apple Silicon)

**Solution**:
1. Open Terminal
2. Run: `codesign --force --deep --sign - /Applications/SmartClaw.app`
3. Try launching again

---

### Linux

**Problem**: AppImage won't run

**Solution**:
```bash
# Make executable
chmod +x SmartClaw-*.AppImage

# Check FUSE is installed
sudo apt install libfuse2  # Ubuntu/Debian
sudo dnf install fuse      # Fedora
```

---

**Problem**: Missing dependencies (.deb/.rpm)

**Solution**:
```bash
# Install missing dependencies
sudo apt install -f  # Debian/Ubuntu
sudo dnf install -f  # Fedora/RHEL
```

---

## Runtime Issues

### App Won't Start

**Problem**: App closes immediately on launch

**Solutions**:
1. Check system requirements (2GB RAM minimum)
2. Update graphics drivers
3. Try running with `--disable-gpu` flag
4. Check logs: `~/.config/SmartClaw/logs/main.log`

---

**Problem**: White/blank screen

**Solutions**:
1. Delete GPU cache:
   ```bash
   # Windows
   rmdir /s "%APPDATA%\SmartClaw\GPUCache"
   
   # macOS
   rm -rf ~/Library/Application\ Support/SmartClaw/GPUCache
   
   # Linux
   rm -rf ~/.config/SmartClaw/GPUCache
   ```
2. Update graphics drivers
3. Disable hardware acceleration in settings

---

### Performance Issues

**Problem**: App is slow or laggy

**Solutions**:
1. Close unused conversations
2. Clear old conversation history
3. Disable animations in settings
4. Check system resources (Task Manager/Activity Monitor)
5. Restart the application

---

**Problem**: High memory usage

**Solutions**:
1. Reduce `agent.memory.maxEntries` in config
2. Clear conversation history
3. Restart the application
4. Check for memory leaks (report on GitHub)

---

## AI/Matrix Issues

### AI Not Responding

**Problem**: No response from AI

**Solutions**:
1. Check API key is valid
2. Verify internet connection
3. Check model endpoint URL
4. Test API directly:
   ```bash
   curl -X POST https://your-api.com/v1/chat \
     -H "Authorization: Bearer YOUR_KEY" \
     -d '{"message": "test"}'
   ```
5. Check API quota/limits

---

**Problem**: AI responses are slow

**Solutions**:
1. Check internet connection speed
2. Try a different/faster model
3. Reduce `maxTokens` in config
4. Check API server status

---

### Matrix Connection Issues

**Problem**: Can't connect to Matrix server

**Solutions**:
1. Verify server URL is correct
2. Check access token is valid
3. Ensure server is online
4. Check firewall settings
5. Test connection:
   ```bash
   curl https://your-matrix-server.com/_matrix/client/versions
   ```

---

**Problem**: Messages not sending/receiving

**Solutions**:
1. Check Matrix server status
2. Verify room permissions
3. Re-sync: Settings → Account → Re-sync
4. Restart the application

---

## Update Issues

**Problem**: Auto-update fails

**Solutions**:
1. Check internet connection
2. Disable firewall temporarily
3. Download latest version manually from GitHub
4. Check disk space

---

**Problem**: Update downloaded but won't install

**Solutions**:
1. Restart the application
2. Run as Administrator (Windows)
3. Check antivirus isn't blocking
4. Manual update: download and install

---

## Configuration Issues

**Problem**: Config not loading

**Solutions**:
1. Verify config file exists
2. Validate JSON syntax:
   ```bash
   cat openclaw.json | python -m json.tool
   ```
3. Check file permissions
4. Restore from backup

---

**Problem**: Environment variables not working

**Solutions**:
1. Verify variable is set: `echo $VARIABLE`
2. Check for typos
3. Restart application after setting
4. Use absolute paths in config

---

## Data Issues

**Problem**: Conversations lost

**Solutions**:
1. Check correct user profile is selected
2. Look for backup files
3. Check disk for errors
4. Restore from backup

---

**Problem**: Can't export/import conversations

**Solutions**:
1. Check file permissions
2. Verify file format is correct
3. Check disk space
4. Try different location

---

## Getting Help

### Logs

Find logs for debugging:

- **Windows**: `%APPDATA%\SmartClaw\logs\`
- **macOS**: `~/Library/Application Support/SmartClaw/logs/`
- **Linux**: `~/.config/SmartClaw/logs/`

### System Information

When reporting issues, include:

1. SmartClaw version
2. Operating system and version
3. Steps to reproduce
4. Error messages
5. Log files (relevant portions)

### Contact

- **GitHub Issues**: https://github.com/nigel201611/SmartClaw/issues
- **Discussions**: https://github.com/nigel201611/SmartClaw/discussions

---

## Still Having Issues?

1. **Restart the application** - Fixes many issues
2. **Reinstall** - Clean install often helps
3. **Check GitHub Issues** - Others may have same problem
4. **Create new issue** - Provide detailed information
