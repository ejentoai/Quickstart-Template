import Image from 'next/image'

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="px-12 py-7 min-h-screen bg-cover bg-center bg-[url('/login_gradient.jpg')]">
      
      {/* Logo */}
      <div className="relative h-7 w-28 mx-auto md:mx-0">
        <Image src='/ejentoLogo.png' alt='ejento logo' fill className="object-contain"/>
      </div>

      {/* Page content */}
      {children}
    </div>
  )
}
