/**
 * Serveur webhook GitHub pour déploiement automatique de TextoPro
 * Lance avec: node scripts/webhook-deploy.js
 * Port: 9101 (configurable via PORT env var)
 */

const http = require('http')
const crypto = require('crypto')
const { execSync } = require('child_process')

const PORT = process.env.WEBHOOK_PORT || 9101
const SECRET = process.env.WEBHOOK_SECRET || ''
const APP_DIR = process.env.APP_DIR || '/var/www/textopro'
const PM2_APP = process.env.PM2_APP || 'textopro'

function verifySignature(payload, signature) {
  if (!SECRET) return true // Pas de secret configuré, on accepte tout (à sécuriser en prod)
  const expected = 'sha256=' + crypto.createHmac('sha256', SECRET).update(payload).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(signature || ''), Buffer.from(expected))
}

function deploy() {
  console.log(`[${new Date().toISOString()}] Déploiement démarré...`)
  try {
    const out = execSync(
      `cd ${APP_DIR} && git pull origin main && npm install --include=dev && npm run build && pm2 restart ${PM2_APP}`,
      { encoding: 'utf8', timeout: 300000 }
    )
    console.log('[Deploy] Succès:', out.slice(-200))
  } catch (err) {
    console.error('[Deploy] Erreur:', err.message)
  }
}

const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/deploy') {
    res.writeHead(404)
    res.end('Not found')
    return
  }

  let body = ''
  req.on('data', chunk => { body += chunk })
  req.on('end', () => {
    const sig = req.headers['x-hub-signature-256']
    if (!verifySignature(body, sig)) {
      console.warn('[Webhook] Signature invalide')
      res.writeHead(401)
      res.end('Unauthorized')
      return
    }

    let event
    try { event = JSON.parse(body) } catch { res.writeHead(400); res.end('Bad JSON'); return }

    const ref = event.ref || ''
    if (!ref.endsWith('/main')) {
      res.writeHead(200)
      res.end('Ignored (not main branch)')
      return
    }

    res.writeHead(200)
    res.end('Deploying...')

    // Déploiement en arrière-plan
    setImmediate(deploy)
  })
})

server.listen(PORT, () => {
  console.log(`[Webhook] Serveur démarré sur port ${PORT}`)
  console.log(`[Webhook] URL: http://72.62.148.170:${PORT}/deploy`)
  console.log(`[Webhook] App: ${PM2_APP} dans ${APP_DIR}`)
})
