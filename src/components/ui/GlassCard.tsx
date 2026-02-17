import type { PropsWithChildren } from 'react'
import clsx from 'clsx'

type GlassCardProps = PropsWithChildren<{
  className?: string
}>

export const GlassCard = ({ className, children }: GlassCardProps) => (
  <article className={clsx('glass-card', className)}>{children}</article>
)
