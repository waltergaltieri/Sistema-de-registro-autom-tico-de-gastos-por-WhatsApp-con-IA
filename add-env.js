const fs = require('fs');
const { execSync } = require('child_process');

try {
  const secrets = JSON.parse(fs.readFileSync('secrets-local.json', 'utf8'));

  const envs = ['production', 'preview', 'development'];
  const appUrl = 'https://sistema-de-registro-autom-tico-de-gastos-por-whats-ehkeea0qx.vercel.app';

  const vars = [
    { name: 'NEXT_PUBLIC_SUPABASE_URL', value: secrets.supabase.url },
    { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: secrets.supabase.anon_key },
    { name: 'SUPABASE_SERVICE_ROLE_KEY', value: secrets.supabase.service_role_key },
    { name: 'BOT_WEBHOOK_SECRET', value: secrets.bot.webhook_secret },
    { name: 'NEXT_PUBLIC_APP_URL', value: appUrl },
    { name: 'GEMINI_API_KEY', value: secrets.gemini.api_key }
  ];

  for (const env of envs) {
    console.log(`\n--- Configuring environment variables for: ${env} ---`);
    for (const v of vars) {
      console.log(`Adding ${v.name} to ${env}...`);
      try {
        // We use vercel env rm to delete first if it already exists, avoiding conflicts, then add it.
        try {
          execSync(`npx vercel env rm ${v.name} ${env} --yes`, { stdio: 'ignore' });
        } catch (e) {
          // Ignore error if it didn't exist
        }
        execSync(`npx vercel env add ${v.name} ${env} --value "${v.value}" --yes`, { stdio: 'inherit' });
      } catch (err) {
        console.error(`Error adding ${v.name}:`, err.message);
      }
    }
  }
  console.log('\nEnvironment variables configuration finished!');
} catch (err) {
  console.error('Failed to run script:', err);
}
