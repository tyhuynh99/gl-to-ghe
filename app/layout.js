import './globals.css';

export const metadata = {
  title: 'GitLab to GitHub Migration Dashboard',
  description: 'Simple tool to migrate repos from GitLab to GitHub Enterprise',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <main className="container">
          {children}
        </main>
      </body>
    </html>
  );
}
