import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

/**
 * GET /api/admin/senders/export-all
 * Export tous les senders PENDING en un seul fichier XLSX format LeTexto
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const statut = searchParams.get('statut') || 'PENDING'

  const senders = await prisma.sender.findMany({
    where: { statut: statut as 'PENDING' | 'APPROVED' | 'REJECTED' },
    include: {
      user: { select: { nom: true, prenom: true, email: true, phone: true, pays: true } },
    },
    orderBy: { created_at: 'asc' },
  })

  if (senders.length === 0) {
    return NextResponse.json({ error: 'Aucun sender à exporter' }, { status: 404 })
  }

  // Format exact du tableau LeTexto
  const rows = senders.map((s, i) => ({
    'Req N°': i + 1,
    'Client': `${s.user.prenom} ${s.user.nom}`,
    'Email Client': s.user.email,
    'SENDER ID': s.nom,
    'Content Description': s.description || '',
    'Email': s.email_contact || '',
    'Website du sender / Application': s.site_web || '',
    'Adresse de l\'entreprise': s.adresse || '',
    'Siège social': s.siege_social || '',
    'Example - Message Content': s.exemple_message || '',
    'Type of Message': s.type_message || 'Promotional',
    'Activité': s.activite || '',
  }))

  const ws = XLSX.utils.json_to_sheet(rows)

  // Style : largeur des colonnes
  ws['!cols'] = [
    { wch: 8 },   // Req N°
    { wch: 20 },  // Client
    { wch: 28 },  // Email Client
    { wch: 15 },  // SENDER ID
    { wch: 35 },  // Content Description
    { wch: 28 },  // Email
    { wch: 30 },  // Website
    { wch: 25 },  // Adresse
    { wch: 20 },  // Siège social
    { wch: 50 },  // Example Message
    { wch: 20 },  // Type of Message
    { wch: 20 },  // Activité
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Senders LeTexto')

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  const date = new Date().toISOString().slice(0, 10)
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="senders-letexto-${date}.xlsx"`,
    },
  })
}
