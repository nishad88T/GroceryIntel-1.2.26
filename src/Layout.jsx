import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { appClient } from '@/api/appClient';
import { Household } from '@/entities/Household';
import {
    LayoutDashboard,
    ScanLine,
    Receipt,
    PiggyBank,
    TrendingUp,
    BookOpen,
    Settings,
    ShoppingCart,
    ShieldCheck,
    HeartPulse,
    Calendar,
    HelpCircle,
    Users,
    FileText,
    Cookie,
    ChefHat,
    Sparkles,
    Upload,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { FeatureProvider, useUserFeatures } from "@/components/shared/FeatureGuard";
import FeedbackButton from "@/components/shared/FeedbackButton";
import PublicLanding from "@/pages/PublicLanding";
import PWAInstallBanner from "@/components/pwa/PWAInstallBanner";
import NotificationCenter from "@/components/shared/NotificationCenter";

const MainLayout = ({ children }) => {
  const location = useLocation();
  const { hasAdvancedAnalytics, hasFeatureGuideAccess, hasAccessToRecipes, loading } = useUserFeatures();

  // Mobile sidebar control: close menu after navigation
  const sidebarTriggerRef = React.useRef(null);
  const handleNavLinkClick = () => {
    if (window.innerWidth < 768) {
      try { sidebarTriggerRef.current?.click(); } catch (_) {}
    }
  };

  const planPrepareItems = [
    { title: "Recipes", url: createPageUrl("Recipes"), icon: ChefHat, color: "text-green-600" },
    { title: "Add Recipe", url: createPageUrl("ParseRecipe"), icon: Sparkles, color: "text-purple-600" },
    { title: "Meal Plan", url: createPageUrl("MealPlan"), icon: Calendar, color: "text-lime-600" },
    { title: "Shopping List", url: createPageUrl("ShoppingList"), icon: ShoppingCart, color: "text-indigo-600" },
  ];

  const trackManageItems = [
    { title: "Scan Receipt", url: createPageUrl("ScanReceipt"), icon: ScanLine, color: "text-blue-600" },
    { title: "My Receipts", url: createPageUrl("Receipts"), icon: Receipt, color: "text-purple-600" },
    { title: "Budget", url: createPageUrl("Budget"), icon: PiggyBank, color: "text-orange-600" },
  ];

  const analyticsItems = [
    { title: "Analytics", url: createPageUrl("Analytics"), icon: TrendingUp, color: "text-teal-600" },
    { title: "Nutrition", url: createPageUrl("Nutrition"), icon: HeartPulse, color: "text-red-600" },
  ];

  const accountSettingsItems = [
    { title: "Settings", url: createPageUrl("Settings"), icon: Settings, color: "text-indigo-600" },
    { title: "Household", url: createPageUrl("Household"), icon: Users, color: "text-cyan-600" },
    { title: "How to Use", url: createPageUrl("Guide"), icon: BookOpen, color: "text-rose-600" },
  ];

  const informationItems = [
    { title: "About", url: createPageUrl("About"), icon: BookOpen, color: "text-slate-600" },
    { title: "FAQs", url: createPageUrl("FAQs"), icon: HelpCircle, color: "text-blue-600" },
    { title: "Privacy", url: createPageUrl("Privacy"), icon: ShieldCheck, color: "text-gray-600" },
    { title: "Terms of Use", url: createPageUrl("TermsOfUse"), icon: FileText, color: "text-gray-600" },
    { title: "Cookie Policy", url: createPageUrl("CookiePolicy"), icon: Cookie, color: "text-gray-600" },
  ];

  const adminToolsItems = [
    { title: "Quick Import", url: createPageUrl("Import"), icon: Upload, color: "text-violet-600" },
    { title: "Features Guide", url: createPageUrl("Features"), icon: HelpCircle, color: "text-cyan-600" },
    { title: "Admin Insights", url: createPageUrl("AdminInsights"), icon: Settings, color: "text-violet-600" },
    { title: "Operational Insights", url: createPageUrl("OperationalInsights"), icon: Settings, color: "text-slate-600" },
    { title: "OCR Testing", url: createPageUrl("OCRTestingDashboard"), icon: FileText, color: "text-blue-600" },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        <Sidebar collapsible="icon" className="border-r border-emerald-100/50 bg-white/80 backdrop-blur-sm">
          <SidebarHeader className="border-b border-emerald-100/50 p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl shadow-lg overflow-hidden flex-shrink-0">
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ac71e3ac2c3a563bdfc531/3463bc20c_GILogo2.png" 
                  alt="GroceryIntel Logo" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-slate-900 text-lg">GroceryIntel™</h2>
                  <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">BETA</span>
                </div>
                <p className="text-xs text-emerald-600 font-medium">Track Smarter. Spend Better.</p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="p-4">
            {/* Dashboard - Homepage */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Home
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-2">
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      className={`hover:bg-emerald-50 transition-all duration-200 rounded-xl px-4 py-3 group ${
                        location.pathname === createPageUrl("Dashboard")
                          ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100'
                          : 'hover:text-emerald-700'
                      }`}
                    >
                      <Link onClick={handleNavLinkClick} to={createPageUrl("Dashboard")} className="flex items-center gap-3">
                        <LayoutDashboard className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform duration-200" />
                        <span className="font-medium text-slate-700">Dashboard</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      className={`hover:bg-emerald-50 transition-all duration-200 rounded-xl px-4 py-3 group ${
                        location.pathname === createPageUrl("PersonalInsights")
                          ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100'
                          : 'hover:text-emerald-700'
                      }`}
                    >
                      <Link onClick={handleNavLinkClick} to={createPageUrl("PersonalInsights")} className="flex items-center gap-3">
                        <Sparkles className="w-5 h-5 text-purple-600 group-hover:scale-110 transition-transform duration-200" />
                        <span className="font-medium text-slate-700">Personal Insights</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Plan & Prepare */}
            {!loading && hasAccessToRecipes && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Plan & Prepare
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="space-y-2">
                    {planPrepareItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          className={`hover:bg-emerald-50 transition-all duration-200 rounded-xl px-4 py-3 group ${
                            location.pathname === item.url
                              ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100'
                              : 'hover:text-emerald-700'
                          }`}
                        >
                          <Link onClick={handleNavLinkClick} to={item.url} className="flex items-center gap-3">
                            <item.icon className={`w-5 h-5 ${item.color} group-hover:scale-110 transition-transform duration-200`} />
                            <span className="font-medium text-slate-700">{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Track & Manage */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Track & Manage
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-2">
                  {trackManageItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        className={`hover:bg-emerald-50 transition-all duration-200 rounded-xl px-4 py-3 group ${
                          location.pathname === item.url
                            ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100'
                            : 'hover:text-emerald-700'
                        }`}
                      >
                        <Link onClick={handleNavLinkClick} to={item.url} className="flex items-center gap-3">
                          <item.icon className={`w-5 h-5 ${item.color} group-hover:scale-110 transition-transform duration-200`} />
                          <span className="font-medium text-slate-700">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Analytics */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Analytics
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-2">
                  {analyticsItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        className={`hover:bg-emerald-50 transition-all duration-200 rounded-xl px-4 py-3 group ${
                          location.pathname === item.url
                            ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100'
                            : 'hover:text-emerald-700'
                        }`}
                      >
                        <Link onClick={handleNavLinkClick} to={item.url} className="flex items-center gap-3">
                          <item.icon className={`w-5 h-5 ${item.color} group-hover:scale-110 transition-transform duration-200`} />
                          <span className="font-medium text-slate-700">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Account & Settings */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Account & Settings
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-2">
                  {accountSettingsItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        className={`hover:bg-emerald-50 transition-all duration-200 rounded-xl px-4 py-3 group ${
                          location.pathname === item.url
                            ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100'
                            : 'hover:text-emerald-700'
                        }`}
                      >
                        <Link onClick={handleNavLinkClick} to={item.url} className="flex items-center gap-3">
                          <item.icon className={`w-5 h-5 ${item.color} group-hover:scale-110 transition-transform duration-200`} />
                          <span className="font-medium text-slate-700">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Information */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Information
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-2">
                  {informationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        className={`hover:bg-emerald-50 transition-all duration-200 rounded-xl px-4 py-3 group ${
                          location.pathname === item.url
                            ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100'
                            : 'hover:text-emerald-700'
                        }`}
                      >
                        <Link onClick={handleNavLinkClick} to={item.url} className="flex items-center gap-3">
                          <item.icon className={`w-5 h-5 ${item.color} group-hover:scale-110 transition-transform duration-200`} />
                          <span className="font-medium text-slate-700">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Admin Tools */}
            {hasFeatureGuideAccess && (
              <SidebarGroup className="mt-4 pt-4 border-t border-slate-200/60">
                <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Admin Tools
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="space-y-2">
                    {adminToolsItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          className={`hover:bg-emerald-50 transition-all duration-200 rounded-xl px-4 py-3 group ${
                            location.pathname === item.url
                              ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100'
                              : 'hover:text-emerald-700'
                          }`}
                        >
                          <Link onClick={handleNavLinkClick} to={item.url} className="flex items-center gap-3">
                            <item.icon className={`w-5 h-5 ${item.color} group-hover:scale-110 transition-transform duration-200`} />
                            <span className="font-medium text-slate-700">{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        className={`hover:bg-emerald-50 transition-all duration-200 rounded-xl px-4 py-3 group ${
                          location.pathname === createPageUrl("InstagramMarketing")
                            ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100'
                            : 'hover:text-emerald-700'
                        }`}
                      >
                        <Link onClick={handleNavLinkClick} to={createPageUrl("InstagramMarketing")} className="flex items-center gap-3">
                          <Sparkles className="w-5 h-5 text-pink-600 group-hover:scale-110 transition-transform duration-200" />
                          <span className="font-medium text-slate-700">Instagram Marketing</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarContent>

          <SidebarFooter className="border-t border-emerald-100/50 p-6">
            <div className="text-xs text-slate-500 text-center">
              © 2025 GroceryIntel™. All rights reserved.
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col min-h-screen">
          {/* Mobile-only header with sidebar trigger */}
          <header className="md:hidden bg-white/90 backdrop-blur-sm border-b border-emerald-100/50 px-6 py-4 sticky top-0 z-50">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <SidebarTrigger ref={sidebarTriggerRef} className="hover:bg-emerald-50 p-2 rounded-lg transition-colors duration-200" />
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg overflow-hidden">
                    <img 
                      src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ac71e3ac2c3a563bdfc531/3463bc20c_GILogo2.png" 
                      alt="GroceryIntel Logo" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h1 className="text-xl font-bold text-slate-900">GroceryIntel™</h1>
                </div>
              </div>
              <NotificationCenter />
            </div>
          </header>

          {/* Desktop notification center */}
          <div className="hidden md:flex items-center justify-end px-6 py-4 bg-white/90 backdrop-blur-sm border-b border-emerald-100/50">
            <NotificationCenter />
          </div>

          {/* Main content area */}
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
        
        <FeedbackButton />
        <PWAInstallBanner />
        </div>
        </SidebarProvider>
        );
        }

        export default function Layout({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const authenticatedPlatformUser = await appClient.auth.me();
                if (!authenticatedPlatformUser) {
                    throw new Error("User not authenticated.");
                }

                console.log("Platform user authenticated:", authenticatedPlatformUser.email);

                // Only update missing/default fields, never touch household_id to preserve invite-based memberships
                const userDataToUpdate = {};
                if (!authenticatedPlatformUser.currency) userDataToUpdate.currency = 'GBP';
                if (!authenticatedPlatformUser.tier) {
                    userDataToUpdate.tier = 'free';
                    // Set trial end date to 1 month from now for new users
                    const trialEndDate = new Date();
                    trialEndDate.setMonth(trialEndDate.getMonth() + 1);
                    userDataToUpdate.trial_end_date = trialEndDate.toISOString();
                    userDataToUpdate.trial_scans_left = 4;
                    userDataToUpdate.trial_recipes_parsed = 0;
                }
                if (authenticatedPlatformUser.monthly_scan_count === undefined) userDataToUpdate.monthly_scan_count = 0;
                if (authenticatedPlatformUser.ai_enhancement_count_this_month === undefined) userDataToUpdate.ai_enhancement_count_this_month = 0;
                if (!authenticatedPlatformUser.shopping_frequency) userDataToUpdate.shopping_frequency = 'weekly';
                if (authenticatedPlatformUser.week_starts_on === undefined) userDataToUpdate.week_starts_on = 1;
                if (authenticatedPlatformUser.auto_create_household === undefined) userDataToUpdate.auto_create_household = true;
                if (authenticatedPlatformUser.welcome_email_sent === undefined) userDataToUpdate.welcome_email_sent = false;

                if (Object.keys(userDataToUpdate).length > 0) {
                    await appClient.auth.updateMe(userDataToUpdate);
                    console.log("User entity provisioned/updated via appClient.auth.updateMe()");
                }

                const appUserRecord = await appClient.auth.me();

                // Removed auto-create household logic - users must explicitly create or join via Household page
                // This prevents overwriting household memberships that were established via invite codes

                setUser(appUserRecord);

                if (appUserRecord && !appUserRecord.welcome_email_sent) {
                    try {
                        // Trigger Brevo automation via list addition (instant email)
                        await appClient.functions.invoke('updateBrevoContact', {
                            email: appUserRecord.email,
                            tags: ['trial_started'],
                            attributes: {
                                first_name: appUserRecord.full_name?.split(' ')[0] || 'User'
                            },
                            eventType: 'trial_started'
                        });
                        await appClient.auth.updateMe({ welcome_email_sent: true });
                        console.log("User added to Brevo trial_started list - automation triggered");
                    } catch (brevoError) {
                        console.warn("Brevo automation trigger failed (non-critical):", brevoError);
                    }
                }

            } catch (error) {
                console.warn("Auth check failed or user not provisioned:", error.message);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };
        
        checkAuth();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-32 h-32 rounded-2xl mx-auto mb-6 animate-pulse overflow-hidden shadow-xl">
                        <img 
                          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ac71e3ac2c3a563bdfc531/3463bc20c_GILogo2.png" 
                          alt="GroceryIntel Logo" 
                          className="w-full h-full object-cover"
                        />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">GroceryIntel™</h1>
                    <p className="text-slate-600">Loading your personalized experience...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <PublicLanding />;
    }

    return (
        <FeatureProvider>
            <MainLayout>{children}</MainLayout>
        </FeatureProvider>
    );
}