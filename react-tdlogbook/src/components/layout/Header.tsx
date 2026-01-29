import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  TruckIcon,
  MapIcon,
  ClipboardDocumentListIcon,
  HomeIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-blue-600 p-1.5 sm:p-2 rounded-lg">
              <TruckIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <span className="text-lg sm:text-xl font-bold text-gray-900">
              ELD Logbook
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
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

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMobileMenu}
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <XMarkIcon className="h-6 w-6" />
            ) : (
              <Bars3Icon className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col space-y-2">
              <MobileNavItem
                to="/dashboard"
                icon={HomeIcon}
                onClick={closeMobileMenu}
              >
                Dashboard
              </MobileNavItem>
              <MobileNavItem
                to="/trips"
                icon={MapIcon}
                onClick={closeMobileMenu}
              >
                Trip Planner
              </MobileNavItem>
              <MobileNavItem
                to="/logs"
                icon={ClipboardDocumentListIcon}
                onClick={closeMobileMenu}
              >
                Logbook
              </MobileNavItem>
            </div>
          </nav>
        )}
      </div>
    </header>
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

interface MobileNavItemProps extends NavItemProps {
  onClick: () => void;
}

function MobileNavItem({ to, icon: Icon, children, onClick }: MobileNavItemProps) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors ${
          isActive
            ? "bg-blue-50 text-blue-700"
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        }`
      }
    >
      <Icon className="h-6 w-6" />
      {children}
    </NavLink>
  );
}
