import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Row,
  Column,
} from '@react-email/components'
import * as React from 'react'

export interface NewInquiryEmailProps {
  jobType: 'translation' | 'interpretation' | 'equipment_rental' | 'notary' | 'transcription'
  jobId: string
  clientName: string
  clientEmail: string
  clientPhone?: string
  // Translation
  sourceLang?: string
  targetLang?: string
  wordCount?: number
  certificationLabel?: string
  estimatedAmount?: number
  missingPricing?: string | null
  // Interpretation
  scheduledAt?: string
  durationMinutes?: number
  locationType?: string
  // Equipment rental
  rentalStartDate?: string
  rentalEndDate?: string
  rentalItems?: Array<{ name: string; qty: number; ratePerDay: number }>
  // Notary
  notaryServiceType?: string
  deliveryMethod?: string
  adminUrl?: string
}

const JOB_TYPE_LABELS: Record<string, string> = {
  translation: 'Translation',
  interpretation: 'Interpretation',
  equipment_rental: 'Equipment Rental',
  notary: 'Notary / Apostille',
  transcription: 'Transcription / Subtitling',
}

export function NewInquiryEmail({
  jobType,
  jobId,
  clientName,
  clientEmail,
  clientPhone,
  sourceLang,
  targetLang,
  wordCount,
  certificationLabel,
  estimatedAmount,
  missingPricing,
  scheduledAt,
  durationMinutes,
  locationType,
  rentalStartDate,
  rentalEndDate,
  rentalItems,
  notaryServiceType,
  deliveryMethod,
  adminUrl,
}: NewInquiryEmailProps) {
  const typeLabel = JOB_TYPE_LABELS[jobType] ?? jobType
  const jobUrl = adminUrl ? `${adminUrl}/admin/translation_jobs/${jobId}` : null

  return (
    <Html>
      <Head />
      <Preview>New {typeLabel} inquiry from {clientName}</Preview>
      <Body style={{ backgroundColor: '#f9fafb', fontFamily: 'sans-serif', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: 560, margin: '32px auto', backgroundColor: '#ffffff', borderRadius: 8, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <Section style={{ backgroundColor: '#1a1a2e', padding: '20px 32px' }}>
            <Heading style={{ color: '#ffffff', fontSize: 18, margin: 0 }}>
              New {typeLabel} Inquiry
            </Heading>
          </Section>

          <Section style={{ padding: '24px 32px' }}>
            <Text style={{ color: '#374151', fontSize: 14, marginTop: 0 }}>
              A new inquiry has been submitted and is waiting for your review.
            </Text>

            {/* Client */}
            <Heading as="h3" style={{ fontSize: 13, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Client</Heading>
            <Row style={{ marginBottom: 16 }}>
              <Column><Text style={{ margin: 0, fontSize: 14, color: '#111827' }}>{clientName}</Text></Column>
            </Row>
            <Row style={{ marginBottom: 4 }}>
              <Column><Text style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>{clientEmail}{clientPhone ? ` · ${clientPhone}` : ''}</Text></Column>
            </Row>

            {/* Job details */}
            <Heading as="h3" style={{ fontSize: 13, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, marginTop: 20, marginBottom: 8 }}>Details</Heading>

            {jobType === 'translation' && (
              <>
                <Row style={{ marginBottom: 4 }}><Column><Text style={{ margin: 0, fontSize: 13, color: '#374151' }}><strong>Languages:</strong> {sourceLang} → {targetLang}</Text></Column></Row>
                {certificationLabel && <Row style={{ marginBottom: 4 }}><Column><Text style={{ margin: 0, fontSize: 13, color: '#374151' }}><strong>Certification:</strong> {certificationLabel}</Text></Column></Row>}
                {(wordCount ?? 0) > 0 && <Row style={{ marginBottom: 4 }}><Column><Text style={{ margin: 0, fontSize: 13, color: '#374151' }}><strong>Word count:</strong> {wordCount?.toLocaleString()}</Text></Column></Row>}
                {estimatedAmount != null && estimatedAmount > 0 && (
                  <Row style={{ marginBottom: 4 }}><Column><Text style={{ margin: 0, fontSize: 13, color: '#374151' }}><strong>Estimated quote:</strong> ${estimatedAmount.toFixed(2)}</Text></Column></Row>
                )}
                {missingPricing && (
                  <Section style={{ backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: 6, padding: '10px 14px', marginTop: 8 }}>
                    <Text style={{ margin: 0, fontSize: 13, color: '#92400e' }}>
                      ⚠ Missing pricing — manual quote required: {missingPricing}
                    </Text>
                  </Section>
                )}
              </>
            )}

            {jobType === 'interpretation' && (
              <>
                <Row style={{ marginBottom: 4 }}><Column><Text style={{ margin: 0, fontSize: 13, color: '#374151' }}><strong>Languages:</strong> {sourceLang} → {targetLang}</Text></Column></Row>
                {locationType && <Row style={{ marginBottom: 4 }}><Column><Text style={{ margin: 0, fontSize: 13, color: '#374151' }}><strong>Type:</strong> {locationType.replace('_', ' ')}</Text></Column></Row>}
                {scheduledAt && <Row style={{ marginBottom: 4 }}><Column><Text style={{ margin: 0, fontSize: 13, color: '#374151' }}><strong>Scheduled:</strong> {scheduledAt}</Text></Column></Row>}
                {durationMinutes && <Row style={{ marginBottom: 4 }}><Column><Text style={{ margin: 0, fontSize: 13, color: '#374151' }}><strong>Duration:</strong> {durationMinutes} minutes</Text></Column></Row>}
                {estimatedAmount != null && estimatedAmount > 0 && (
                  <Row style={{ marginBottom: 4 }}><Column><Text style={{ margin: 0, fontSize: 13, color: '#374151' }}><strong>Estimated quote:</strong> ${estimatedAmount.toFixed(2)}</Text></Column></Row>
                )}
              </>
            )}

            {jobType === 'equipment_rental' && (
              <>
                {rentalStartDate && <Row style={{ marginBottom: 4 }}><Column><Text style={{ margin: 0, fontSize: 13, color: '#374151' }}><strong>Dates:</strong> {rentalStartDate} – {rentalEndDate}</Text></Column></Row>}
                {rentalItems && rentalItems.length > 0 && (
                  <Row style={{ marginBottom: 4 }}><Column><Text style={{ margin: 0, fontSize: 13, color: '#374151' }}><strong>Items:</strong> {rentalItems.map(i => `${i.qty}× ${i.name}`).join(', ')}</Text></Column></Row>
                )}
                {estimatedAmount != null && estimatedAmount > 0 && (
                  <Row style={{ marginBottom: 4 }}><Column><Text style={{ margin: 0, fontSize: 13, color: '#374151' }}><strong>Estimated quote:</strong> ${estimatedAmount.toFixed(2)}</Text></Column></Row>
                )}
              </>
            )}

            {jobType === 'notary' && (
              <>
                {notaryServiceType && <Row style={{ marginBottom: 4 }}><Column><Text style={{ margin: 0, fontSize: 13, color: '#374151' }}><strong>Service:</strong> {notaryServiceType}</Text></Column></Row>}
                {deliveryMethod && <Row style={{ marginBottom: 4 }}><Column><Text style={{ margin: 0, fontSize: 13, color: '#374151' }}><strong>Delivery:</strong> {deliveryMethod.replace('_', ' ')}</Text></Column></Row>}
              </>
            )}

            {jobUrl && (
              <Section style={{ marginTop: 24 }}>
                <a href={jobUrl} style={{ display: 'inline-block', backgroundColor: '#1a1a2e', color: '#ffffff', padding: '10px 20px', borderRadius: 6, fontSize: 14, textDecoration: 'none', fontWeight: 600 }}>
                  View in Admin →
                </a>
              </Section>
            )}
          </Section>

          <Section style={{ borderTop: '1px solid #f3f4f6', padding: '16px 32px' }}>
            <Text style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>
              Job ID: {jobId} · LA Translation &amp; Interpretation
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
