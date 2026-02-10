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
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
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

// Import all public pages
import LandingPage from "@/pages/LandingPage";
import FeaturesPage from "@/pages/Features";
import AboutPage from "@/pages/About";
import PricingPage from "@/pages/Pricing";
import FAQsPage from "@/pages/FAQs";
import TermsOfUsePage from "@/pages/TermsOfUse";
import PrivacyPage from "@/pages/Privacy";
import CookiePolicyPage from "@/pages/CookiePolicy";
import GuidePage from "@/pages/Guide";

const MainLayout = ({ children }) => {
  const location = useLocation();
  const { hasAdvancedAnalytics, hasFeatureGuideAccess, hasAccessToRecipes, loading } = useUserFeatures();

  let navigationItems = [
      { title: "Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard, color: "text-emerald-600" },
      { title: "Scan Receipt", url: createPageUrl("ScanReceipt"), icon: ScanLine, color: "text-blue-600" },
      { title: "My Receipts", url: createPageUrl("Receipts"), icon: Receipt, color: "text-purple-600" },
      { title: "Budget", url: createPageUrl("Budget"), icon: PiggyBank, color: "text-orange-600" },
      { title: "Analytics", url: createPageUrl("Analytics"), icon: TrendingUp, color: "text-teal-600" },
      { title: "Shopping List", url: createPageUrl("ShoppingList"), icon: Calendar, color: "text-indigo-600" },
      { title: "Nutrition", url: createPageUrl("Nutrition"), icon: HeartPulse, color: "text-red-600" },
      { title: "Household", url: createPageUrl("Household"), icon: Users, color: "text-cyan-600" },
      { title: "About", url: createPageUrl("About"), icon: BookOpen, color: "text-slate-600" },
      { title: "How to Use", url: createPageUrl("Guide"), icon: BookOpen, color: "text-rose-600" },
  ];
  
  if (hasAccessToRecipes && !loading) {
      const recipeNavItem = { title: "Recipes", url: createPageUrl("Recipes"), icon: ChefHat, color: "text-green-600" };
      const mealPlanNavItem = { title: "Meal Plan", url: createPageUrl("MealPlan"), icon: Calendar, color: "text-lime-600" };
      
      const insertIndex = navigationItems.findIndex(item => item.title === "Nutrition");
      if (insertIndex !== -1) {
          navigationItems.splice(insertIndex, 0, recipeNavItem, mealPlanNavItem);
      } else {
          navigationItems.push(recipeNavItem, mealPlanNavItem); 
      }
  }

  const adminNavItems = [
      { title: "Features Guide", url: createPageUrl("Features"), icon: HelpCircle, color: "text-cyan-600", feature: "feature-guide" },
      { title: "Admin Insights", url: createPageUrl("AdminInsights"), icon: Settings, color: "text-violet-600", feature: "feature-guide" },
      { title: "Operational Insights", url: createPageUrl("OperationalInsights"), icon: Settings, color: "text-slate-600", feature: "feature-guide" },
      { title: "OCR Testing", url: createPageUrl("OCRTestingDashboard"), icon: FileText, color: "text-blue-600", feature: "feature-guide" },
  ];

  const bottomNavItems = [
      { title: "Settings", url: createPageUrl("Settings"), icon: Settings, color: "text-indigo-600" },
      { title: "Privacy", url: createPageUrl("Privacy"), icon: ShieldCheck, color: "text-gray-600" },
      { title: "Terms of Use", url: createPageUrl("TermsOfUse"), icon: FileText, color: "text-gray-600" },
      { title: "Cookie Policy", url: createPageUrl("CookiePolicy"), icon: Cookie, color: "text-gray-600" },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        <Sidebar className="border-r border-emerald-100/50 bg-white/80 backdrop-blur-sm">
          <SidebarHeader className="border-b border-emerald-100/50 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-slate-900 text-lg">GroceryIntel™</h2>
                  <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">BETA</span>
                </div>
                <p className="text-xs text-emerald-600 font-medium">Smart Tracking</p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="p-4 flex flex-col justify-between">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-2">
                  {!loading && navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        className={`hover:bg-emerald-50 transition-all duration-200 rounded-xl px-4 py-3 group ${
                          location.pathname === item.url
                            ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100'
                            : 'hover:text-emerald-700'
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3">
                          <item.icon className={`w-5 h-5 ${item.color} group-hover:scale-110 transition-transform duration-200`} />
                          <span className="font-medium text-slate-700">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            
            <div>
                 { hasFeatureGuideAccess && (
                    <SidebarGroup className="mt-4 pt-4 border-t border-slate-200/60">
                        <SidebarGroupContent>
                             <SidebarMenu className="space-y-2">
                                {adminNavItems.map((item) => (
                                    <SidebarMenuItem key={item.title}>
                                      <SidebarMenuButton
                                        asChild
                                        className={`hover:bg-emerald-50 transition-all duration-200 rounded-xl px-4 py-3 group ${
                                          location.pathname === item.url
                                            ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100'
                                            : 'hover:text-emerald-700'
                        }`}
                                      >
                                        <Link to={item.url} className="flex items-center gap-3">
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

                <SidebarGroup className="mt-4 pt-4 border-t border-slate-200/60">
                  <SidebarGroupContent>
                    <SidebarMenu className="space-y-2">
                       {bottomNavItems.map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            asChild
                            className={`hover:bg-emerald-50 transition-all duration-200 rounded-xl px-4 py-3 group ${
                              location.pathname === item.url
                                ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100'
                                : 'hover:text-emerald-700'
                            }`}
                          >
                            <Link to={item.url} className="flex items-center gap-3">
                              <item.icon className={`w-5 h-5 ${item.color} group-hover:scale-110 transition-transform duration-200`} />
                              <span className="font-medium text-slate-700">{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
            </div>
          </SidebarContent>

          <SidebarFooter className="border-t border-emerald-100/50 p-6">
            <div className="text-xs text-slate-500 text-center">
              © 2025 GroceryIntel™. All rights reserved.
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col min-h-screen">
          <header className="bg-white/90 backdrop-blur-sm border-b border-emerald-100/50 px-6 py-4 md:hidden sticky top-0 z-50">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-emerald-50 p-2 rounded-lg transition-colors duration-200" />
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-6 h-6 text-emerald-600" />
                <h1 className="text-xl font-bold text-slate-900">GroceryIntel™</h1>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
        
        <FeedbackButton />
      </div>
    </SidebarProvider>
  );
}

export default function Layout({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const location = useLocation();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const authenticatedPlatformUser = await appClient.auth.me();
                if (!authenticatedPlatformUser) {
                    throw new Error("User not authenticated.");
                }

                console.log("Platform user authenticated:", authenticatedPlatformUser.email);

                const userDataToUpdate = {
                    currency: authenticatedPlatformUser.currency || 'GBP',
                    tier: authenticatedPlatformUser.tier || 'standard',
                    monthly_scan_count: authenticatedPlatformUser.monthly_scan_count || 0,
                    ai_enhancement_count_this_month: authenticatedPlatformUser.ai_enhancement_count_this_month || 0,
                    shopping_frequency: authenticatedPlatformUser.shopping_frequency || 'weekly',
                    week_starts_on: authenticatedPlatformUser.week_starts_on ?? 1,
                    auto_create_household: authenticatedPlatformUser.auto_create_household ?? true,
                    welcome_email_sent: authenticatedPlatformUser.welcome_email_sent || false
                };

                await appClient.auth.updateMe(userDataToUpdate);
                console.log("User entity provisioned/updated via appClient.auth.updateMe()");

                const appUserRecord = await appClient.auth.me();
                
                if (!appUserRecord.household_id && appUserRecord.auto_create_household) {
                    console.log("User has no household_id, creating one for them...");
                    const newHousehold = await Household.create({
                        name: `${appUserRecord.full_name || appUserRecord.email}'s Household`,
                        admin_id: appUserRecord.id,
                    });
                    
                    await appClient.auth.updateMe({ household_id: newHousehold.id });
                    appUserRecord.household_id = newHousehold.id;
                    console.log(`Created new household ${newHousehold.name} and linked to user ${appUserRecord.email}`);
                }

                setUser(appUserRecord);
                
                if (appUserRecord && !appUserRecord.welcome_email_sent) {
                    try {
                        await appClient.functions.invoke('sendWelcomeEmail');
                        await appClient.auth.updateMe({ welcome_email_sent: true });
                        console.log("Welcome email triggered and marked as sent for new user");
                    } catch (emailError) {
                        console.warn("Welcome email trigger failed (non-critical):", emailError);
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
                    <ShoppingCart className="w-12 h-12 text-emerald-600 mx-auto mb-4 animate-pulse" />
                    <h1 className="text-2xl font-bold text-slate-900">GroceryIntel™</h1>
                    <p className="text-slate-600">Loading your personalized experience...</p>
                </div>
            </div>
        );
    }

    // For unauthenticated users, manually render the appropriate public page based on URL
    if (!user) {
        switch (location.pathname) {
            case '/Features':
                return <FeaturesPage />;
            case '/About':
                return <AboutPage />;
            case '/Pricing':
                return <PricingPage />;
            case '/FAQs':
                return <FAQsPage />;
            case '/TermsOfUse':
                return <TermsOfUsePage />;
            case '/Privacy':
                return <PrivacyPage />;
            case '/CookiePolicy':
                return <CookiePolicyPage />;
            case '/Guide':
                return <GuidePage />;
            default:
                // Default to landing page for root or any unrecognized route
                return <LandingPage />;
        }
    }

    // If user is authenticated, wrap in MainLayout with FeatureProvider
    return (
        <FeatureProvider>
            <MainLayout>{children}</MainLayout>
        </FeatureProvider>
    );
}