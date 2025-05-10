export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ padding: 40 }}>
        {children}
      </body>
    </html>
  );
}