import Image from 'next/image'
import Link from 'next/link'

const variantClasses = {
  header: 'h-20 w-auto',
  mobile: 'h-16 w-auto',
  footer: 'h-20 w-auto',
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
        width={900}
        height={320}
        priority={priority}
        className={`${variantClasses[variant] || variantClasses.header} object-contain`}
      />
    </Link>
  )
}
