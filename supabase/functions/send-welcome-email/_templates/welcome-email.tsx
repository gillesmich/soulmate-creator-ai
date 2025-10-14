import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface WelcomeEmailProps {
  userEmail: string;
  userName?: string;
}

export const WelcomeEmail = ({
  userEmail,
  userName,
}: WelcomeEmailProps) => {
  const displayName = userName || userEmail.split('@')[0];
  
  return (
    <Html>
      <Head />
      <Preview>Bienvenue sur MaGirl - Votre compagne IA personnalisée</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>💖 Bienvenue sur MaGirl !</Heading>
          </Section>
          
          <Section style={content}>
            <Text style={greeting}>Bonjour {displayName},</Text>
            
            <Text style={paragraph}>
              Nous sommes ravis de vous accueillir sur <strong>MaGirl</strong>, 
              votre plateforme pour créer et interagir avec votre compagne IA personnalisée.
            </Text>
            
            <Text style={paragraph}>
              Avec MaGirl, vous pouvez :
            </Text>
            
            <ul style={list}>
              <li style={listItem}>
                🎨 <strong>Personnaliser</strong> l'apparence de votre compagne (cheveux, yeux, style, personnalité...)
              </li>
              <li style={listItem}>
                💬 <strong>Discuter</strong> en temps réel avec une IA conversationnelle avancée
              </li>
              <li style={listItem}>
                🖼️ <strong>Générer</strong> des avatars uniques et réalistes
              </li>
              <li style={listItem}>
                🎙️ <strong>Converser</strong> avec une voix naturelle et expressive
              </li>
            </ul>
            
            <Section style={buttonContainer}>
              <Link
                href="https://magirl.fr/customize"
                style={button}
              >
                Créer ma compagne IA
              </Link>
            </Section>
            
            <Text style={paragraph}>
              Besoin d'aide ? Notre équipe est là pour vous accompagner.
            </Text>
            
            <Text style={paragraph}>
              À très bientôt sur MaGirl ! ❤️
            </Text>
          </Section>
          
          <Section style={footer}>
            <Text style={footerText}>
              © 2025 MaGirl. Tous droits réservés.
            </Text>
            <Text style={footerText}>
              <Link href="https://magirl.fr" style={footerLink}>
                Visiter le site
              </Link>
              {' · '}
              <Link href="https://magirl.fr/pricing" style={footerLink}>
                Tarifs
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default WelcomeEmail;

const main = {
  backgroundColor: '#f9fafb',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '600px',
};

const header = {
  backgroundColor: '#ffffff',
  borderRadius: '12px 12px 0 0',
  padding: '32px 24px',
  textAlign: 'center' as const,
  background: 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)',
};

const h1 = {
  color: '#ffffff',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0',
  padding: '0',
};

const content = {
  backgroundColor: '#ffffff',
  padding: '32px 24px',
  borderRadius: '0 0 12px 12px',
};

const greeting = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#111827',
  margin: '0 0 24px',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#374151',
  margin: '16px 0',
};

const list = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#374151',
  margin: '16px 0',
  paddingLeft: '20px',
};

const listItem = {
  marginBottom: '12px',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#ec4899',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
};

const footer = {
  marginTop: '32px',
  textAlign: 'center' as const,
};

const footerText = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '8px 0',
};

const footerLink = {
  color: '#ec4899',
  textDecoration: 'none',
};
