export const metadata = {
  title: 'RepoSafe',
  description: 'AI-powered GitHub repository security scanner. Know if a repo will attack your machine before you run a single command.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
