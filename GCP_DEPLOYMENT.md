# SikaRemit — GCP Production Deployment Guide

Complete step-by-step guide to deploy SikaRemit on Google Cloud Platform.

## Architecture

```
sikaremit.com (Vercel)  →  api.sikaremit.com (GCP Cloud Run)
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              Cloud SQL       Memorystore      Secret Manager
              (PostgreSQL)    (Redis)          (API keys)
```

**Services deployed on Cloud Run:**
- `sikaremit-api` — Django API server (auto-scales 0→10)
- `sikaremit-worker` — Celery task worker (always-on, 1→5 instances)
- `sikaremit-beat` — Celery Beat scheduler (always-on, exactly 1 instance)

---

## Prerequisites

- [Google Cloud account](https://console.cloud.google.com/) with billing enabled
- [GitHub repository](https://github.com/) with SikaRemit code
- [Vercel account](https://vercel.com/) (free tier works)
- [Namecheap domain](https://www.namecheap.com/) — sikaremit.com
- Payment provider accounts: Stripe, MTN MoMo, etc.
- SendGrid, Sentry, Grafana Cloud accounts

**You do NOT need Docker installed locally.** Cloud Build handles container builds.

---

## Step 1: Create GCP Project

1. Go to [GCP Console](https://console.cloud.google.com/)
2. Create a new project: **SikaRemit** (note the Project ID, e.g., `sikaremit-prod`)
3. Enable billing for the project

### Enable Required APIs

Run in [Cloud Shell](https://shell.cloud.google.com/) (or install gcloud CLI):

```bash
gcloud config set project YOUR_PROJECT_ID

# Enable all required APIs
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  sqladmin.googleapis.com \
  redis.googleapis.com \
  secretmanager.googleapis.com \
  compute.googleapis.com \
  vpcaccess.googleapis.com
```

---

## Step 2: Set Up Artifact Registry (Container Storage)

```bash
# Create a Docker repository for container images
gcloud artifacts repositories create sikaremit \
  --repository-format=docker \
  --location=us-central1 \
  --description="SikaRemit container images"
```

---

## Step 3: Set Up Cloud SQL (PostgreSQL)

```bash
# Create PostgreSQL instance
gcloud sql instances create sikaremit-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --storage-size=10GB \
  --storage-auto-increase \
  --backup-start-time=03:00 \
  --availability-type=zonal \
  --root-password=CHANGE_THIS_STRONG_PASSWORD

# Create the database
gcloud sql databases create sikaremit --instance=sikaremit-db

# Create application user
gcloud sql users create sikaremit_user \
  --instance=sikaremit-db \
  --password=CHANGE_THIS_APP_PASSWORD
```

**Note your DATABASE_URL:** 
```
postgresql://sikaremit_user:APP_PASSWORD@/sikaremit?host=/cloudsql/PROJECT_ID:us-central1:sikaremit-db
```

---

## Step 4: Set Up Memorystore (Redis)

```bash
# Create Redis instance
gcloud redis instances create sikaremit-redis \
  --size=1 \
  --region=us-central1 \
  --redis-version=redis_7_0 \
  --tier=basic
```

After creation, note the Redis IP:
```bash
gcloud redis instances describe sikaremit-redis --region=us-central1 --format='value(host)'
```

**Your REDIS_URL:** `redis://REDIS_IP:6379/0`

### VPC Connector (required for Cloud Run → Redis)

```bash
# Create a VPC connector so Cloud Run can reach Redis
gcloud compute networks vpc-access connectors create sikaremit-connector \
  --region=us-central1 \
  --range=10.8.0.0/28
```

---

## Step 5: Set Up Secret Manager

Store all sensitive values in GCP Secret Manager:

```bash
# Django secret key (generate a random one)
echo -n "$(python3 -c 'import secrets; print(secrets.token_urlsafe(50))')" | \
  gcloud secrets create django-secret-key --data-file=-

# Database URL
echo -n "postgresql://sikaremit_user:APP_PASSWORD@/sikaremit?host=/cloudsql/PROJECT_ID:us-central1:sikaremit-db" | \
  gcloud secrets create database-url --data-file=-

# Redis URL
echo -n "redis://REDIS_IP:6379/0" | \
  gcloud secrets create redis-url --data-file=-

# Stripe
echo -n "sk_live_YOUR_STRIPE_SECRET_KEY" | \
  gcloud secrets create stripe-secret-key --data-file=-

echo -n "whsec_YOUR_STRIPE_WEBHOOK_SECRET" | \
  gcloud secrets create stripe-webhook-secret --data-file=-

# MTN MoMo
echo -n "YOUR_MTN_API_KEY" | \
  gcloud secrets create mtn-momo-api-key --data-file=-

echo -n "YOUR_MTN_API_SECRET" | \
  gcloud secrets create mtn-momo-api-secret --data-file=-

echo -n "YOUR_MTN_SUBSCRIPTION_KEY" | \
  gcloud secrets create mtn-momo-subscription-key --data-file=-

echo -n "https://proxy.momoapi.mtn.com" | \
  gcloud secrets create mtn-momo-api-url --data-file=-

# SendGrid
echo -n "YOUR_SENDGRID_API_KEY" | \
  gcloud secrets create sendgrid-api-key --data-file=-

# Sentry
echo -n "https://YOUR_SENTRY_DSN@sentry.io/PROJECT_ID" | \
  gcloud secrets create sentry-dsn --data-file=-
```

### Grant Cloud Run access to secrets

```bash
# Get the Cloud Run service account
SA="$(gcloud iam service-accounts list --filter='displayName:Compute Engine' --format='value(email)')"

# Grant access to all secrets
for SECRET in django-secret-key database-url redis-url stripe-secret-key stripe-webhook-secret mtn-momo-api-key mtn-momo-api-secret mtn-momo-subscription-key mtn-momo-api-url sendgrid-api-key sentry-dsn; do
  gcloud secrets add-iam-policy-binding $SECRET \
    --member="serviceAccount:$SA" \
    --role="roles/secretmanager.secretAccessor"
done
```

---

## Step 6: Set Up GitHub Actions (CI/CD)

### Create a GCP Service Account for GitHub

```bash
# Create service account
gcloud iam service-accounts create github-deployer \
  --display-name="GitHub Actions Deployer"

SA_EMAIL="github-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com"

# Grant required roles
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/cloudbuild.builds.builder"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/secretmanager.secretAccessor"

# Create and download key
gcloud iam service-accounts keys create github-sa-key.json \
  --iam-account=$SA_EMAIL
```

### Add Secrets to GitHub Repository

Go to **GitHub → Your Repo → Settings → Secrets and Variables → Actions** and add:

| Secret Name | Value |
|-------------|-------|
| `GCP_PROJECT_ID` | Your GCP project ID (e.g., `sikaremit-prod`) |
| `GCP_SA_KEY` | Contents of `github-sa-key.json` (the entire JSON) |
| `GCP_REGION` | `us-central1` |

**Delete the local key file after uploading:**
```bash
rm github-sa-key.json
```

---

## Step 7: Set Up Vercel (Frontend)

1. Go to [vercel.com](https://vercel.com/) → **New Project**
2. Import your GitHub repository
3. Configure:
   - **Framework Preset:** Next.js
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
4. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_API_URL` = `https://api.sikaremit.com`
   - Any other frontend env vars
5. Click **Deploy**

Vercel will now auto-deploy on every push to `main`.

---

## Step 8: Configure Custom Domains

### Backend: api.sikaremit.com → Cloud Run

```bash
# Map custom domain to Cloud Run
gcloud run domain-mappings create \
  --service sikaremit-api \
  --domain api.sikaremit.com \
  --region us-central1
```

GCP will show you DNS records to add. Go to **Namecheap DNS** and add:
- **CNAME** record: `api` → value provided by GCP

### Frontend: sikaremit.com → Vercel

In **Vercel dashboard** → Your project → Settings → Domains:
1. Add `sikaremit.com`
2. Add `www.sikaremit.com`
3. Vercel shows you the DNS records

Go to **Namecheap DNS** and add:
- **A** record: `@` → `76.76.21.21` (Vercel's IP)
- **CNAME** record: `www` → `cname.vercel-dns.com`

### Email: SendGrid Domain Authentication

In **SendGrid dashboard** → Settings → Sender Authentication:
1. Authenticate domain: `sikaremit.com`
2. SendGrid gives you CNAME records
3. Add them all in **Namecheap DNS**

### Grafana (optional): grafana.sikaremit.com

In **Grafana Cloud** → Custom Domains → add `grafana.sikaremit.com`
Add CNAME record in Namecheap.

---

## Step 9: Configure Sentry

1. Go to [sentry.io](https://sentry.io/) → Create Project → Django
2. Copy the DSN
3. Store it in GCP Secret Manager (already done in Step 5)
4. In Sentry dashboard, configure:
   - Alerts → Set up email/Slack alerts for critical errors
   - Performance → Enable transaction sampling

---

## Step 10: Configure Grafana

1. Go to [Grafana Cloud](https://grafana.com/products/cloud/)
2. Create a GCP integration:
   - Data Source → Google Cloud Monitoring
   - Authenticate with a GCP service account
3. Import dashboards for:
   - Cloud Run metrics (request count, latency, error rate)
   - Cloud SQL metrics (connections, queries, storage)
   - Custom SikaRemit dashboards (transaction volume, success rate)

---

## Step 11: First Deploy

After all the above setup, push to main to trigger your first deploy:

```bash
git add .
git commit -m "Add GCP deployment infrastructure"
git push origin main
```

GitHub Actions will:
1. Run backend tests
2. Run frontend tests
3. Run E2E tests
4. Build Docker image → push to Artifact Registry → deploy to Cloud Run
5. Vercel auto-deploys frontend

### Verify

```bash
# Check Cloud Run services
gcloud run services list --region=us-central1

# Check API health
curl https://api.sikaremit.com/api/v1/health/

# Check frontend
curl https://sikaremit.com
```

---

## Cost Estimate (Monthly)

| Service | Tier | Estimated Cost |
|---------|------|---------------|
| Cloud Run (API) | 512Mi, auto-scale 0→10 | $0-30 (pay per request) |
| Cloud Run (Worker) | 512Mi, always-on 1 | ~$15 |
| Cloud Run (Beat) | 256Mi, always-on 1 | ~$8 |
| Cloud SQL | db-f1-micro, 10GB | ~$10 |
| Memorystore (Redis) | 1GB Basic | ~$35 |
| Artifact Registry | Storage | ~$1 |
| Secret Manager | 6+ secrets | < $1 |
| **Total** | | **~$70-100/mo** |

**Note:** Cloud Run API scales to zero when idle — great for early stage. As traffic grows, costs scale linearly and predictably.

---

## Useful Commands

```bash
# View Cloud Run logs
gcloud run services logs read sikaremit-api --region=us-central1

# View worker logs
gcloud run services logs read sikaremit-worker --region=us-central1

# Update a secret
echo -n "new_value" | gcloud secrets versions add secret-name --data-file=-

# Scale up manually
gcloud run services update sikaremit-api --max-instances=20 --region=us-central1

# Connect to Cloud SQL (for debugging)
gcloud sql connect sikaremit-db --user=sikaremit_user

# Run Django management command
gcloud run jobs create run-management-cmd \
  --image=REGION-docker.pkg.dev/PROJECT/sikaremit/sikaremit-api:latest \
  --args="python,manage.py,YOUR_COMMAND" \
  --region=us-central1
```

---

## Security Checklist Before Go-Live

- [ ] All secrets stored in GCP Secret Manager (not .env files)
- [ ] Cloud SQL has no public IP (uses Cloud SQL Auth Proxy via Cloud Run)
- [ ] Redis on private VPC (not publicly accessible)
- [ ] Stripe using `sk_live_` keys (not `sk_test_`)
- [ ] MTN MoMo API URL is `proxy.momoapi.mtn.com` (not sandbox)
- [ ] `ENVIRONMENT=production` set on all Cloud Run services
- [ ] `DEBUG=False` in production
- [ ] Sentry DSN configured and receiving errors
- [ ] SendGrid domain authenticated (SPF/DKIM/DMARC)
- [ ] HTTPS enforced on all endpoints
- [ ] Cloud Armor WAF rules enabled (optional but recommended)
- [ ] Payment webhook URLs registered with all providers
- [ ] BoG compliance reporting configured (if required)
