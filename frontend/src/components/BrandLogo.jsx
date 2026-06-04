import Image from 'next/image'
import Link from 'next/link'

const variantClasses = {
  header: 'h-12 w-auto',
  mobile: 'h-11 w-auto',
  footer: 'h-14 w-auto',
  sidebar: 'h-10 w-auto',
  admin: 'h-11 w-auto',
}

export default function BrandLogo({
  href = '/',
  variant = 'header',
  className = '',
  priority = false,
}) {
  return (
    <Link href={href} className={`inline-flex items-center ${className}`}>
      <Image
        src="/sight-ledger-logo.png"
        alt="Sight Ledger"
        width={320}
        height={120}
        priority={priority}
        className={`${variantClasses[variant] || variantClasses.header} object-contain`}
      />
    </Link>
  )
}
