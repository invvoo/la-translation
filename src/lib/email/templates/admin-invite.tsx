import {
  Html, Head, Body, Container, Heading, Text, Hr, Section, Button,
} from '@react-email/components'

interface AdminInviteEmailProps {
  inviteeName: string
  inviterName?: string
  acceptUrl: string
}

export function AdminInviteEmail({ inviteeName, inviterName, acceptUrl }: AdminInviteEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f9fafb', fontFamily: 'Arial, sans-serif', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: '560px', margin: '40px auto', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <Section style={{ backgroundColor: '#1a1a2e', padding: '24px 32px' }}>
            <Heading style={{ color: '#ffffff', fontSize: '18px', fontWeight: '700', margin: 0 }}>
              LA Translation &amp; Interpretation
            </Heading>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', margin: '4px 0 0' }}>
              Admin Portal Invitation
            </Text>
          </Section>

          <Section style={{ padding: '32px' }}>
            <Text style={{ fontSize: '16px', color: '#111827', margin: '0 0 16px' }}>
              Hi {inviteeName},
            </Text>
            <Text style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 24px' }}>
              {inviterName
                ? `${inviterName} has invited you to join the LA Translation admin portal.`
                : 'You have been invited to join the LA Translation admin portal.'}
              {' '}Click the button below to set up your account and get access.
            </Text>

            <Button
              href={acceptUrl}
              style={{
                display: 'inline-block',
                backgroundColor: '#1a1a2e',
                color: '#ffffff',
                padding: '12px 28px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                textDecoration: 'none',
              }}
            >
              Accept Invitation
            </Button>

            <Text style={{ fontSize: '12px', color: '#9ca3af', marginTop: '24px', lineHeight: '1.5' }}>
              This link expires in 24 hours. If you did not expect this invitation, you can safely ignore this email.
            </Text>
          </Section>

          <Hr style={{ borderColor: '#e5e7eb', margin: 0 }} />
          <Section style={{ padding: '16px 32px' }}>
            <Text style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>
              LA Translation &amp; Interpretation · Los Angeles, CA
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
