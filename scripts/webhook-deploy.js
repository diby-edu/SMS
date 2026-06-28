const http = require('node:http')
const crypto = require('node:crypto')
const { spawn } = require('node:child_process')

const SECRET = process.env.WEBHOOK_SECRET || ''
const PORT = 9101

http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/webhook') {
    return res.end('TextoPro Webhook Server')
  }

  let body = ''
  req.on('data', chunk => { body += chunk.toString() })
  req.on('end', () => {
    const signature = req.headers['x-hub-signature-256']
    if (!signature) return res.end('No signature')

    const digest = 'sha256=' + crypto.createHmac('sha256', SECRET).update(body).digest('hex')
    if (signature !== digest) {
      console.error('❌ Signature invalide')
      res.writeHead(401)
      return res.end('Invalid signature')
    }

    let event
    try { event = JSON.parse(body) } catch { return res.end('Bad JSON') }

    // Ignorer si ce n'est pas un push sur main
    if (event.ref !== 'refs/heads/main') {
      return res.end('Ignored (not main)')
    }

    console.log('✅ Push sur main détecté. Déploiement...')
    res.end('Deploying...')

    const deploy = spawn('bash', ['/var/www/textopro/deploy.sh'])
    deploy.stdout.on('data', d => console.log(`stdout: ${d}`))
    deploy.stderr.on('data', d => console.error(`stderr: ${d}`))
    deploy.on('close', code => console.log(`Deploy terminé avec code ${code}`))
  })
}).listen(PORT, () => {
  console.log(`TextoPro webhook serveur sur port ${PORT}`)
})
