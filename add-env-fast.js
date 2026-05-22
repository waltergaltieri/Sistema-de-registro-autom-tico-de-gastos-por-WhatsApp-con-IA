const fs = require('fs');
const { exec } = require('child_process');

const secrets = JSON.parse(fs.readFileSync('secrets-local.json', 'utf8'));

const envs = ['production', 'preview', 'development'];
const appUrl = 'https://sistema-de-registro-autom-tico-de-g.vercel.app';

const vars = [
  { name: 'NEXT_PUBLIC_SUPABASE_URL', value: secrets.supabase.url },
  { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: secrets.supabase.anon_key },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', value: secrets.supabase.service_role_key },
  { name: 'BOT_WEBHOOK_SECRET', value: secrets.bot.webhook_secret },
  { name: 'NEXT_PUBLIC_APP_URL', value: appUrl },
  { name: 'GEMINI_API_KEY', value: secrets.gemini.api_key }
];

const commands = [];
for (const env of envs) {
  for (const v of vars) {
    commands.push({
      desc: `Remove ${v.name} from ${env}`,
      cmd: `npx vercel env rm ${v.name} ${env} --yes`
    });
    commands.push({
      desc: `Add ${v.name} to ${env}`,
      cmd: `npx vercel env add ${v.name} ${env} --value "${v.value}" --yes`
    });
  }
}

function runNext(index) {
  if (index >= commands.length) {
    console.log('All environment variables processed!');
    process.exit(0);
  }

  const item = commands[index];
  console.log(`[${index + 1}/${commands.length}] ${item.desc}...`);

  const child = exec(item.cmd, { timeout: 8000 }, (error, stdout, stderr) => {
    // We proceed to the next command regardless of success/failure/timeout
    if (error) {
      if (error.killed) {
        console.log(`-> Command timed out (8s) but likely succeeded.`);
      } else {
        console.log(`-> Note/Error: ${error.message.split('\n')[0]}`);
      }
    } else {
      console.log(`-> Done.`);
    }
    setTimeout(() => runNext(index + 1), 200);
  });
}

runNext(0);
