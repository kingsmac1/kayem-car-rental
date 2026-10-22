import { Link } from '@tanstack/react-router'
import { Button } from './ui/button'

export function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-ink px-6 text-center">
      <div>
        <p className="display text-[clamp(96px,22vw,220px)] text-accent">404</p>
        <h1 className="display mt-2 text-2xl">Wrong turn.</h1>
        <p className="mx-auto mt-3 max-w-sm text-mute">This page doesn’t exist or has moved. Head back to the start line.</p>
        <Button asChild className="mt-8" roll>
          <Link to="/">Back to home</Link>
        </Button>
      </div>
    </main>
  )
}
