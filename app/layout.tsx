import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Glass Marble Labyrinth Maze',
  description: 'Realistic 3D wooden marble maze with physics-driven glass marble, smooth board tilting, and solvable maze labyrinths.',
  openGraph: {
    title: 'Glass Marble Labyrinth Maze',
    description: 'Realistic 3D wooden marble maze with physics-driven glass marble, smooth board tilting, and solvable maze labyrinths.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Glass Marble Labyrinth Maze',
    description: 'Realistic 3D wooden marble maze with physics-driven glass marble, smooth board tilting, and solvable maze labyrinths.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
