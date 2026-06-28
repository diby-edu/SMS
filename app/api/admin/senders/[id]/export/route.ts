import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const TYPE_LABELS: Record<string, string> = {
  PROMOTIONAL: 'Promotionnel',
  OTP: 'OTP',
  TRANSACTIONAL: 'Transactionnel',
}

/**
 * GET /api/admin/senders/[id]/export
 * Génère un fichier CSV avec toutes les infos du sender pour soumission à LeTexto
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const sender = await prisma.sender.findUnique({
    where: { id: params.id },
    include: { user: { select: { nom: true, prenom: true, email: true, phone: true, pays: true } } },
  })

  if (!sender) {
    return NextResponse.json({ error: 'Sender introuvable' }, { status: 404 })
  }

  const rows = [
    ['Champ', 'Valeur'],
    ['Nom du Sender', sender.nom],
    ['Type de message', TYPE_LABELS[sender.type_message ?? ''] || sender.type_message || ''],
    ['Description', sender.description || ''],
    ['Email de contact', sender.email_contact || ''],
    ['Site web / Application', sender.site_web || ''],
    ['Adresse', sender.adresse || ''],
    ['Siège social', sender.siege_social || ''],
    ['Exemple de message', sender.exemple_message || ''],
    ["Secteur d'activité", sender.activite || ''],
    ['', ''],
    ['--- Informations Client ---', ''],
    ['Nom', `${sender.user.prenom} ${sender.user.nom}`],
    ['Email', sender.user.email],
    ['Téléphone', sender.user.phone],
    ['Pays', sender.user.pays],
    ['Date de demande', new Date(sender.created_at).toLocaleString('fr-FR')],
  ]

  // Échapper les valeurs CSV (guillemets si virgule ou guillemet dans la valeur)
  const escapeCSV = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`
    }
    return val
  }

  const csv = rows.map((row) => row.map(escapeCSV).join(',')).join('\r\n')
  const filename = `sender_${sender.nom}_${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
