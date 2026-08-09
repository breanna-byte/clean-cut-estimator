# Clean & Cut OS — Free Cloud Setup

## 1. Create the Supabase project
1. Go to https://supabase.com and create a free project.
2. Give it a name like `clean-cut-os`.
3. Save your database password somewhere private.

## 2. Build the database and private photo bucket
1. In Supabase, open **SQL Editor**.
2. Open `supabase-setup.sql` from this GitHub repository.
3. Copy the entire file into SQL Editor and click **Run** once.

This creates the quote, job, customer, and settings tables, enables Row Level Security, and creates a private `clean-cut-photos` bucket.

## 3. Create the owner login
1. In Supabase, open **Authentication → Users**.
2. Add a user for the Clean & Cut owner email.
3. Set a strong password. This becomes the cloud dashboard login.

## 4. Copy only the browser-safe project values
1. In Supabase, open **Project Settings → API** (or the current API Keys page).
2. Copy the **Project URL**.
3. Copy the **publishable key** / browser-safe anon key.
4. NEVER copy a service_role or secret key into GitHub.

## 5. Connect GitHub Pages
Edit `supabase-config.js` so it looks like:

```js
window.CC_SUPABASE_CONFIG = {
  url: 'https://YOUR-PROJECT.supabase.co',
  publishableKey: 'YOUR-PUBLISHABLE-KEY'
};
```

Commit the change to `main`. GitHub Pages will redeploy automatically.

## 6. Test
1. Open the public estimator in a private/incognito window.
2. Create a quote and click **Save Quote Request**.
3. Open the Business Dashboard.
4. Use **Cloud Sign In** with the owner account created in Supabase.
5. Verify the quote appears from the cloud.
6. Create or complete a job and add before/after photos.
7. Open the app on another device and sign in to confirm synced business data.

## Privacy model
- Anonymous visitors may INSERT new quote requests only.
- Anonymous visitors cannot list/read quotes, jobs, customers, settings, or private photos.
- Signed-in business users may manage business records and private photos.
- Photos are stored in a private Supabase Storage bucket.
