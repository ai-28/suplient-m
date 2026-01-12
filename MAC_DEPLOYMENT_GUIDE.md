# Mac Deployment Guide for Suplient

Complete guide for building and deploying Android and iOS apps on Mac.

## 📋 Prerequisites

- ✅ macOS with Xcode installed
- ✅ Android Studio installed
- ✅ Node.js and npm installed
- ✅ Apple Developer Account ($99/year) for iOS
- ✅ Google Play Developer Account ($25 one-time) for Android

## 🚀 Quick Start

### 1. Initial Setup

```bash
# Navigate to project
cd ~/path/to/suplient

# Install dependencies
npm install

# Build Next.js app
npm run build

# Sync Capacitor
npm run cap:sync
```

### 2. Make Gradle Executable (First Time Only)

```bash
# Make gradlew executable
chmod +x android/gradlew

# Verify
ls -l android/gradlew
```

## 📱 Building for Android

### Development Build (Debug APK)

```bash
# Build debug APK
npm run android:build:debug

# APK location: android/app/build/outputs/apk/debug/app-debug.apk
```

### Production Build (Release AAB for Play Store)

#### Option A: Using Android Studio (Recommended)

```bash
# Open in Android Studio
npm run cap:open:android
```

In Android Studio:
1. **Build → Generate Signed Bundle / APK**
2. Select **Android App Bundle (AAB)**
3. Create or select your keystore
4. Enter keystore password
5. Select release build variant
6. Click **Finish**

The AAB will be at: `android/app/build/outputs/bundle/release/app-release.aab`

#### Option B: Command Line

```bash
# Build release AAB
npm run android:build:bundle

# Or build release APK
npm run android:build:release
```

**Note:** For command line, you need to configure signing first (see below).

### Configure Android Signing

1. **Create keystore** (one-time):
```bash
keytool -genkey -v -keystore suplient-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias suplient
```

2. **Create `android/keystore.properties`**:
```properties
storeFile=../suplient-release-key.jks
keyAlias=suplient
storePassword=YOUR_STORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
```

3. **Update `android/app/build.gradle`** to use signing config (see Android Studio method above for easier setup).

## 🍎 Building for iOS

### Development Build

```bash
# Open in Xcode
npm run cap:open:ios
```

In Xcode:
1. Select your development team
2. Select a simulator or connected device
3. Click **Run** (▶️) or press `Cmd + R`

### Production Build (App Store)

```bash
# Open in Xcode
npm run cap:open:ios
```

In Xcode:
1. **Select your team**: Project → Signing & Capabilities → Select Team
2. **Set Bundle Identifier**: `com.suplient.app`
3. **Update version**: General → Version and Build
4. **Select "Any iOS Device"** in device selector
5. **Product → Archive**
6. Wait for archive to complete
7. **Distribute App** → **App Store Connect**
8. Follow the wizard to upload

## 🔧 Available Scripts

### Capacitor Commands
- `npm run cap:sync` - Sync web assets to native platforms
- `npm run cap:copy` - Copy web assets only
- `npm run cap:update` - Update native dependencies
- `npm run cap:open:ios` - Open iOS project in Xcode
- `npm run cap:open:android` - Open Android project in Android Studio
- `npm run cap:build` - Build Next.js and sync to Capacitor

### Android Commands
- `npm run android:build:debug` - Build debug APK
- `npm run android:build:release` - Build release APK
- `npm run android:build:bundle` - Build release AAB (for Play Store)
- `npm run android:clean` - Clean build files
- `npm run android:build:full` - Full build (Next.js + sync + APK)

### iOS Commands
- `npm run ios:build` - Build Next.js, sync, and open Xcode

## 📝 Production Deployment Checklist

### Before Building for Production

1. **Deploy Next.js Backend**
   - Deploy to Vercel, Railway, AWS, etc.
   - Get your production URL

2. **Update `capacitor.config.json`**
   ```json
   {
     "server": {
       "url": "https://your-deployed-app.com",
       "cleartext": false
     }
   }
   ```

3. **Rebuild and Sync**
   ```bash
   npm run build
   npm run cap:sync
   ```

### Android (Google Play Store)

- [ ] Build release AAB
- [ ] Test on physical device
- [ ] Create Google Play Console account
- [ ] Upload AAB to Play Console
- [ ] Complete store listing (screenshots, description, etc.)
- [ ] Submit for review

### iOS (App Store)

- [ ] Archive app in Xcode
- [ ] Upload to App Store Connect
- [ ] Create app in App Store Connect
- [ ] Complete app information
- [ ] Add screenshots and metadata
- [ ] Submit for review

## 🧪 Testing

### Android Emulator

```bash
# Start Android Studio emulator
npm run cap:open:android
# Then run from Android Studio

# Or install APK on running emulator
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### iOS Simulator

```bash
# Open in Xcode and run
npm run cap:open:ios
# Select simulator and click Run
```

### Physical Devices

**Android:**
```bash
# Enable USB debugging on device
# Connect via USB
adb devices
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

**iOS:**
- Connect iPhone via USB
- Select device in Xcode
- Click Run

## 🔐 Important Notes

### Keystore Security
- **Never commit** keystore files to git
- Keep keystore password secure
- You'll need the same keystore for all future Android updates

### App Signing
- **Android**: Use the same keystore for all updates
- **iOS**: Managed by Apple (App Store) or your development certificate

### Environment Variables
- Set production environment variables in your deployed Next.js server
- Don't hardcode sensitive data in the app

## 🐛 Troubleshooting

### "Permission denied" on gradlew
```bash
chmod +x android/gradlew
```

### "SDK location not found"
Create `android/local.properties`:
```properties
sdk.dir=/Users/YourUsername/Library/Android/sdk
```

### Xcode build errors
- Make sure CocoaPods are installed: `cd ios/App && pod install`
- Check Xcode version compatibility
- Verify signing certificates

### Android build errors
- Clean build: `npm run android:clean`
- Sync again: `npm run cap:sync`
- Check Android SDK is installed in Android Studio

## 📚 Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Android Developer Guide](https://developer.android.com/guide)
- [iOS Developer Guide](https://developer.apple.com/documentation)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

## 🎯 Quick Reference

### Full Build Workflow

```bash
# 1. Deploy Next.js backend first
# 2. Update capacitor.config.json with production URL
# 3. Build and sync
npm run build
npm run cap:sync

# 4. Android
npm run cap:open:android
# Build signed AAB in Android Studio

# 5. iOS
npm run cap:open:ios
# Archive and upload in Xcode
```

### File Locations

- **Debug APK**: `android/app/build/outputs/apk/debug/app-debug.apk`
- **Release AAB**: `android/app/build/outputs/bundle/release/app-release.aab`
- **iOS Archive**: Managed by Xcode (usually in ~/Library/Developer/Xcode/Archives)

