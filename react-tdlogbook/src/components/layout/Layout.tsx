import { Outlet, NavLink } from "react-router-dom";
import {
  TruckIcon,
  MapIcon,
  ClipboardDocumentListIcon,
  HomeIcon,
} from "@heroicons/react/24/outline";

export function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <TruckIcon className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">
                ELD Logbook
              </span>
            </div>

            {/* Navigation */}
            <nav className="flex items-center gap-1">
              <NavItem to="/dashboard" icon={HomeIcon}>
                Dashboard
              </NavItem>
              <NavItem to="/trips" icon={MapIcon}>
                Trip Planner
              </NavItem>
              <NavItem to="/logs" icon={ClipboardDocumentListIcon}>
                Logbook
              </NavItem>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            © 2026 ELD Logbook. All rights reserved. | FMCSA Compliant
          </p>
        </div>
      </footer>
    </div>
  );
}

interface NavItemProps {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}

function NavItem({ to, icon: Icon, children }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? "bg-blue-50 text-blue-700"
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        }`
      }
    >
      <Icon className="h-5 w-5" />
      {children}
    </NavLink>
  );
}
