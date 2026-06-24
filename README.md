# Rascom Technology — Company Website

Pure static HTML/CSS/JS site + Azure Function for the contact form (Gmail SMTP).
No framework, no build step. Deployed via GitHub → Azure Static Web Apps (free tier).

## Project structure
```
/                           Static site files
  index.html, about.html, services.html,
  portfolio.html, crm.html, careers.html, contact.html
  css/style.css
  js/main.js                Nav + contact form (POSTs to /api/contact)
  img/
  staticwebapp.config.json  Azure routing — clean URLs, 301 redirects, headers
  .gitignore                Excludes local.settings.json and node_modules

api/                        Azure Functions (Node.js)
  contact/index.js          POST /api/contact → Gmail SMTP via nodemailer
  package.json
  host.json
  local.settings.json       LOCAL credentials only — gitignored, never committed
```

---

## Local debugging

### Prerequisites (one-time install)
1. [Node.js 18+](https://nodejs.org)
2. Azure Functions Core Tools:
   ```bash
   npm install -g azure-functions-core-tools@4 --unsafe-perm true
   ```
3. [VS Code](https://code.visualstudio.com) + **Azure Static Web Apps** extension (optional but handy)

### Steps
```bash
# 1. Install API dependencies
cd api
npm install

# 2. Fill in your Gmail credentials in api/local.settings.json
#    (this file is gitignored — safe to put real values here)
#    SMTP_USER = website@rascomtechnology.com
#    SMTP_PASS = your-16-char-gmail-app-password
#    SMTP_TO   = contactus@rascomtechnology.com

# 3. Start the Azure Function locally (from the api/ folder)
func start
# API now running at http://localhost:7071/api/contact

# 4. In a second terminal, serve the static site from the root folder
cd ..
npx http-server . -p 8080 --proxy http://localhost:7071
# Site at http://localhost:8080 — contact form works end-to-end
```

> The `--proxy` flag forwards `/api/*` calls from the static site to the
> local Function, exactly mirroring how Azure Static Web Apps wires them together.

---

## Deploy to Azure Static Web Apps

### First deploy
1. Push this repo to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial site"
   git remote add origin https://github.com/YOUR_USERNAME/rascom-website.git
   git push -u origin main
   ```

2. In Azure Portal → **Static Web Apps** → **Create**:
   - Name: `RascomWebSite`
   - Plan: **Free**
   - Source: **GitHub** → sign in → select repo + branch (`main`)
   - Build details:
     - **App location**: `/`
     - **Api location**: `api`
     - **Output location**: *(leave blank)*
   - Click **Review + create** → **Create**

3. Azure creates `.github/workflows/azure-static-web-apps-*.yml` automatically
   and triggers the first deploy (~2 minutes).

### Set SMTP credentials in Azure (production)
In Azure Portal → your Static Web App → **Configuration** → **Add**:

| Name | Value |
|------|-------|
| `SMTP_USER` | `website@rascomtechnology.com` |
| `SMTP_PASS` | your 16-char Gmail App Password |
| `SMTP_TO`   | `contactus@rascomtechnology.com` |

Click **Save**. These are injected as environment variables — never in the code or repo.

### Every deploy after that
```bash
git add .
git commit -m "your change"
git push
```
GitHub Actions deploys automatically in ~2 minutes.

### Custom domain
Azure Portal → your Static Web App → **Custom domains** → **Add**
- Enter `rascomtechnology.com`
- Add the CNAME/TXT record Azure gives you to your DNS
- Free SSL certificate provisioned automatically

---

## Gmail App Password (if not set up yet)
1. Enable 2-Step Verification on `website@rascomtechnology.com`
2. Go to https://myaccount.google.com/apppasswords
3. Create an app password → copy the 16-character code
4. Use it as `SMTP_PASS` above
