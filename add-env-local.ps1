$envs = @("production", "preview", "development")

foreach ($env in $envs) {
  Write-Host "Configuring env vars for $env..."
  npx vercel env add NEXT_PUBLIC_SUPABASE_URL $env --value "https://dengbjhvbtaokmbkafrs.supabase.co" --yes
  npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY $env --value "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlbmdiamh2YnRhb2ttYmthZnJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MTA2NDIsImV4cCI6MjA5NDk4NjY0Mn0.n5CrBCQ-14Z60B7OrTwkIwjBFxJecxv0BsCMWvAdt3A" --yes
  npx vercel env add SUPABASE_SERVICE_ROLE_KEY $env --value "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlbmdiamh2YnRhb2ttYmthZnJzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQxMDY0MiwiZXhwIjoyMDk0OTg2NjQyfQ._024ovcx3M1Q2uqDdzc3WaS6uUp_5nzzUfzhL9soiNw" --yes
  npx vercel env add BOT_WEBHOOK_SECRET $env --value "wh_sec_7a2f8b9d3c5e6f1a4b8d9c2e0f3a5b6c" --yes
  npx vercel env add NEXT_PUBLIC_APP_URL $env --value "https://sistema-de-registro-autom-tico-de-g.vercel.app" --yes
}
