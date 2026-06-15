import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import {
  BoxIconLine,
  ChevronDownIcon,
  DocsIcon,
  DollarLineIcon,
  GridIcon,
  HorizontaLDots,
  PieChartIcon,
  UserCircleIcon,
} from "../icons";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";
import type { Role } from "../types";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  minRole: Role;
  subItems?: { name: string; path: string; minRole: Role }[];
};

const ROLE_RANK: Record<Role, number> = { cashier: 0, manager: 1, owner: 2 };

const navItems: NavItem[] = [
  { icon: <GridIcon />, name: "Dashboard", path: "/", minRole: "manager" },
  { icon: <DollarLineIcon />, name: "Point of Sale", path: "/pos", minRole: "cashier" },
  { icon: <DocsIcon />, name: "Transactions", path: "/sales", minRole: "manager" },
  { icon: <BoxIconLine />, name: "Inventory", path: "/inventory", minRole: "manager" },
  {
    icon: <PieChartIcon />,
    name: "Reports",
    minRole: "manager",
    subItems: [
      { name: "Daily Summary", path: "/reports/daily", minRole: "manager" },
      { name: "Product Sales", path: "/reports/products", minRole: "manager" },
    ],
  },
  {
    icon: <UserCircleIcon />,
    name: "Settings",
    minRole: "owner",
    subItems: [
      { name: "Users & Cashiers", path: "/settings/users", minRole: "owner" },
      { name: "Business", path: "/settings/business", minRole: "owner" },
    ],
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const { principal } = useAuth();
  const location = useLocation();

  const role = principal?.role ?? "cashier";
  const rank = ROLE_RANK[role];

  const items = navItems
    .filter((item) => rank >= ROLE_RANK[item.minRole])
    .map((item) => ({
      ...item,
      subItems: item.subItems?.filter((s) => rank >= ROLE_RANK[s.minRole]),
    }));

  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [subHeight, setSubHeight] = useState<Record<number, number>>({});
  const subRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname],
  );

  useEffect(() => {
    let matched = false;
    items.forEach((nav, index) => {
      nav.subItems?.forEach((sub) => {
        if (isActive(sub.path)) {
          setOpenIndex(index);
          matched = true;
        }
      });
    });
    if (!matched) setOpenIndex(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, isActive]);

  useEffect(() => {
    if (openIndex !== null && subRefs.current[openIndex]) {
      setSubHeight((prev) => ({
        ...prev,
        [openIndex]: subRefs.current[openIndex]?.scrollHeight || 0,
      }));
    }
  }, [openIndex]);

  const showText = isExpanded || isHovered || isMobileOpen;

  return (
    <aside
      className={`fixed left-0 top-0 z-50 mt-16 flex h-screen flex-col border-r border-gray-200 bg-white px-5 text-gray-900 transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900 lg:mt-0 print:hidden
        ${isExpanded || isMobileOpen || isHovered ? "w-[290px]" : "w-[90px]"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`flex py-8 ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"}`}>
        <Link to="/pos" className="flex items-center gap-2">
          <span className="text-2xl">🧾</span>
          {showText && (
            <span className="text-xl font-semibold text-gray-800 dark:text-white/90">
              BillPOS
            </span>
          )}
        </Link>
      </div>

      <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear">
        <nav className="mb-6">
          <h2
            className={`mb-4 flex text-xs uppercase leading-[20px] text-gray-400 ${
              !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
            }`}
          >
            {showText ? "Menu" : <HorizontaLDots className="size-6" />}
          </h2>

          <ul className="flex flex-col gap-2">
            {items.map((nav, index) =>
              nav.subItems && nav.subItems.length > 0 ? (
                <li key={nav.name}>
                  <button
                    onClick={() =>
                      setOpenIndex((cur) => (cur === index ? null : index))
                    }
                    className={`menu-item group ${
                      openIndex === index ? "menu-item-active" : "menu-item-inactive"
                    } ${!isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"}`}
                  >
                    <span
                      className={`menu-item-icon-size ${
                        openIndex === index
                          ? "menu-item-icon-active"
                          : "menu-item-icon-inactive"
                      }`}
                    >
                      {nav.icon}
                    </span>
                    {showText && <span className="menu-item-text">{nav.name}</span>}
                    {showText && (
                      <ChevronDownIcon
                        className={`ml-auto size-5 transition-transform duration-200 ${
                          openIndex === index ? "rotate-180 text-brand-500" : ""
                        }`}
                      />
                    )}
                  </button>
                  {showText && (
                    <div
                      ref={(el) => {
                        subRefs.current[index] = el;
                      }}
                      className="overflow-hidden transition-all duration-300"
                      style={{
                        height: openIndex === index ? `${subHeight[index] ?? 0}px` : "0px",
                      }}
                    >
                      <ul className="ml-9 mt-2 space-y-1">
                        {nav.subItems.map((sub) => (
                          <li key={sub.name}>
                            <Link
                              to={sub.path}
                              className={`menu-dropdown-item ${
                                isActive(sub.path)
                                  ? "menu-dropdown-item-active"
                                  : "menu-dropdown-item-inactive"
                              }`}
                            >
                              {sub.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              ) : (
                nav.path && (
                  <li key={nav.name}>
                    <Link
                      to={nav.path}
                      className={`menu-item group ${
                        isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                      } ${!isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"}`}
                    >
                      <span
                        className={`menu-item-icon-size ${
                          isActive(nav.path)
                            ? "menu-item-icon-active"
                            : "menu-item-icon-inactive"
                        }`}
                      >
                        {nav.icon}
                      </span>
                      {showText && <span className="menu-item-text">{nav.name}</span>}
                    </Link>
                  </li>
                )
              ),
            )}
          </ul>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
