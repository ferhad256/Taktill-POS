import type { ReactNode } from "react";
import GridShape from "../../components/common/GridShape";
import ThemeTogglerTwo from "../../components/common/ThemeTogglerTwo";
import { Logo } from "../../components/common/Logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative z-1 bg-white p-6 dark:bg-gray-900 sm:p-0">
      <div className="relative flex h-screen w-full flex-col justify-center dark:bg-gray-900 sm:p-0 lg:flex-row">
        {children}
        <div className="hidden h-full w-full items-center bg-brand-950 dark:bg-white/5 lg:grid lg:w-1/2">
          <div className="relative z-1 flex items-center justify-center">
            <GridShape />
            <div className="flex max-w-sm flex-col items-center px-6 text-center">
              <div className="mb-6 rounded-2xl bg-white px-6 py-4 shadow-theme-lg">
                <Logo className="h-12" />
              </div>
              <p className="text-gray-400 dark:text-white/60">
                Billing &amp; Point of Sale for retail shops and supermarkets in
                Uganda &amp; East Africa.
              </p>
            </div>
          </div>
        </div>
        <div className="fixed bottom-6 right-6 z-50 hidden sm:block">
          <ThemeTogglerTwo />
        </div>
      </div>
    </div>
  );
}
