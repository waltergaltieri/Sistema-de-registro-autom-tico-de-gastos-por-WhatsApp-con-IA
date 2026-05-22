"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Receipt,
  LayoutDashboard,
  Table2,
  Tags,
  Users,
  FileDown,
  AlertCircle,
  Menu,
  LogOut,
  ChevronRight,
  X,
  MessageSquare,
} from "lucide-react";
import type { UserProfile } from "@/lib/types";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["super_admin", "admin", "partner", "readonly"] },
  { name: "Gastos", href: "/dashboard/gastos", icon: Table2, roles: ["super_admin", "admin", "partner", "readonly"] },
  { name: "Categorías", href: "/dashboard/categorias", icon: Tags, roles: ["super_admin", "admin"] },
  { name: "Socios", href: "/dashboard/socios", icon: Users, roles: ["super_admin", "admin"] },
  { name: "Grupos WhatsApp", href: "/dashboard/grupos", icon: MessageSquare, roles: ["super_admin"] },
  { name: "Exportar", href: "/dashboard/exportar", icon: FileDown, roles: ["super_admin", "admin"] },
  { name: "Logs", href: "/dashboard/logs", icon: AlertCircle, roles: ["super_admin", "admin"] },
];

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Administrador",
  partner: "Socio",
  readonly: "Solo lectura",
};

function SidebarContent({
  onNavigate,
  userProfile,
}: {
  onNavigate?: () => void;
  userProfile: UserProfile | null;
}) {
  const pathname = usePathname();
  const userRole = userProfile?.role || "partner";

  const filteredNavigation = navigation.filter((item) =>
    item.roles.includes(userRole)
  );

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
          <Receipt className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-bold text-base tracking-tight">Gastos Socios</h2>
          <p className="text-[11px] text-muted-foreground -mt-0.5">Control de gastos</p>
        </div>
      </div>

      <Separator className="mx-4 w-auto" />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {filteredNavigation.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                  isActive
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <Icon
                  className={cn(
                    "w-[18px] h-[18px] shrink-0 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                <span>{item.name}</span>
                {isActive && (
                  <ChevronRight className="w-4 h-4 ml-auto text-primary/50" />
                )}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 mt-auto">
        <UserMenu userProfile={userProfile} />
      </div>
    </div>
  );
}

function UserMenu({ userProfile }: { userProfile: UserProfile | null }) {
  const supabase = createClient();
  const router = useRouter();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const name = userProfile ? `${userProfile.full_name} ${userProfile.last_name || ""}`.trim() : "Usuario";
  const roleLabel = userProfile ? roleLabels[userProfile.role] || "Socio" : "Socio";
  const initials = userProfile?.full_name ? userProfile.full_name[0].toUpperCase() : "U";

  // Use dynamic color for the user avatar fallback if configured
  const avatarBg = userProfile?.color ? { backgroundColor: `${userProfile.color}15`, color: userProfile.color } : undefined;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="w-full">
        <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-accent transition-colors text-left">
          <Avatar className="h-8 w-8">
            <AvatarFallback 
              className="bg-primary/10 text-primary text-xs font-semibold"
              style={avatarBg}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{name}</p>
            <p className="text-[11px] text-muted-foreground truncate">{roleLabel}</p>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("users_profile")
            .select("*")
            .eq("auth_user_id", user.id)
            .maybeSingle();
          if (profile) {
            setUserProfile(profile);
          }
        }
      } catch (error) {
        console.error("Error loading user profile:", error);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [supabase]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col border-r border-border bg-sidebar">
        <SidebarContent userProfile={userProfile} />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0 bg-sidebar [&>button]:hidden">
          <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
          <div className="absolute right-3 top-3 z-50">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <SidebarContent userProfile={userProfile} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-40">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              }
            />
          </Sheet>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary text-primary-foreground">
              <Receipt className="w-4 h-4" />
            </div>
            <span className="font-semibold text-sm">Gastos Socios</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

