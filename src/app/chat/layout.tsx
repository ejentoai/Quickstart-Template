import { cookies } from 'next/headers';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AuthGuard } from '@/components/authentication/auth-guard';

export default async function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [cookieStore] = await Promise.all([cookies()]);
  const isCollapsed = cookieStore.get('sidebar:state')?.value !== 'true';

  return (
    <AuthGuard>
      <SidebarProvider defaultOpen={!isCollapsed}>
        <AppSidebar />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  );
}
