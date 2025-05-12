// /app/layout.tsx
import './globals.css';
import { UserProvider } from '@auth0/nextjs-auth0/client';

export const metadata = {
  title: 'TrainYourAI',
  description: 'Personal AI powered by your vault',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <UserProvider>
          {children}
        </UserProvider>
      </body>
    </html>
  );
}