# Deployment Guide: S4Carlisle Evaluation System

This guide explains how to deploy the application on a Linux server with a **perpetual database** using Google Firebase Firestore.

## 1. Firebase Project Setup (Perpetual DB)

To ensure your data is stored permanently and not just in the browser's LocalStorage:

1.  **Create a Firebase Project**: Go to the [Firebase Console](https://console.firebase.google.com/).
2.  **Add a Web App**: Register a new web app to get your configuration object.
3.  **Enable Firestore**:
    *   Click "Firestore Database" in the sidebar.
    *   Click "Create database".
    *   Select a location (e.g., `us-east1`).
    *   Start in **Production Mode**.
4.  **Configure Security Rules**:
    *   Go to the "Rules" tab in Firestore.
    *   To allow the app to function (adjust for strict production security later), use:
      ```
      rules_version = '2';
      service cloud.firestore {
        match /databases/{database}/documents {
          match /{document=**} {
            allow read, write: if true;
          }
        }
      }
      ```
    *   *Note: In a high-security environment, you should restrict writes to authorized users only.*

## 2. Linux Server Preparation

Login to your Linux server via SSH and ensure Node.js is installed.

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (Version 18 or 20 recommended)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

## 3. Application Deployment

1.  **Clone the repository** (or upload the files):
    ```bash
    cd /var/www
    # Assuming the app is in a folder named 'evaluation-system'
    cd evaluation-system
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Environment Variables**:
    Create a `.env.local` file in the root directory:
    ```bash
    nano .env.local
    ```
    Add your Firebase credentials and Gemini API Key:
    ```env
    # Gemini AI Config
    GEMINI_API_KEY=your_gemini_api_key_here

    # Firebase Config (Required for perpetual database)
    VITE_FIREBASE_API_KEY=your_api_key
    VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
    VITE_FIREBASE_PROJECT_ID=your_project_id
    VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
    VITE_FIREBASE_MESSAGING_SENDER_ID=your_id
    VITE_FIREBASE_APP_ID=your_app_id
    ```

4.  **Build the Production Assets**:
    ```bash
    npm run build
    ```

## 4. Serving the Application

You can use `npx serve` for a quick setup, or Nginx for a professional deployment.

### Option A: Using Serve & PM2 (Recommended)
```bash
# Install PM2 to keep the process running
sudo npm install -g pm2

# Start the server
pm2 start "npx serve -s dist -p 3000" --name "evaluation-tool"

# Ensure it starts on reboot
pm2 save
pm2 startup
```

### Option B: Using Nginx
If you want to use a domain name and SSL:
1.  Install Nginx: `sudo apt install nginx`
2.  Configure your site to point to the `/var/www/evaluation-system/dist` directory.

## 5. Verification
Once the `VITE_FIREBASE_PROJECT_ID` is correctly detected by the application, the console will log:
`"Firebase initialized successfully"`
And the database will switch from LocalStorage mode to **Cloud Firestore mode** automatically. All candidates, submissions, and exam papers will now persist in the cloud.