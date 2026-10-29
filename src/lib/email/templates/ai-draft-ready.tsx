import {
  Html, Head, Body, Container, Heading, Text, Hr, Section,
} from '@react-email/components'

interface AiDraftReadyEmailProps {
  jobId: string
  clientName: string
  sourceLang: string
  targetLang: string
  wordCount: number
}

export function AiDraftReadyEmail({
  jobId,
  clientName,
  sourceLang,
  targetLang,
  wordCount,
}: AiDraftReadyEmailProps) {
  const adminUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/admin/translation_jobs/${jobId}/assign`

  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f9f9f9', margin: 0 }}>
        <Container style={{ maxWidth: 600, margin: '40px auto', backgroundColor: '#ffffff', borderRadius: 8, padding: 32 }}>
          <Heading style={{ color: '#1a1a2e', fontSize: 22, marginBottom: 8 }}>
            AI Draft Ready — Assign Reviewer
          </Heading>
          <Text style={{ color: '#444', fontSize: 15 }}>
            An AI translation draft has been completed and is ready for human review.
          </Text>
          <Section style={{ backgroundColor: '#fffbf0', borderRadius: 8, padding: '16px 24px', margin: '24px 0' }}>
            <Text style={{ margin: '0 0 6px', fontSize: 15 }}>
              <strong>Client:</strong> {clientName}
            </Text>
            <Text style={{ margin: '0 0 6px', fontSize: 15 }}>
              <strong>Languages:</strong> {sourceLang} → {targetLang}
            </Text>
            <Text style={{ margin: '0 0 6px', fontSize: 15 }}>
              <strong>Word Count:</strong> {wordCount.toLocaleString()}
            </Text>
          </Section>
          <Text style={{ color: '#444', fontSize: 15 }}>
            Please assign a translator/reviewer and share the AI draft for review:{' '}
            <a href={adminUrl} style={{ color: '#1a1a2e' }}>Open Job in Admin Portal</a>
          </Text>
          <Hr style={{ margin: '32px 0', borderColor: '#eee' }} />
          <Text style={{ color: '#888', fontSize: 13 }}>
            L.A. Translation &amp; Interpretation — Internal Notification
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
