import { NavLink, Outlet } from "react-router-dom";

//Navbar
const NAV_ITEMS = [
  { label: "Dashboard", path: "/dashboard", icon: "📊" },
  { label: "Analyse", path: "/dashboard/analyse", icon: "🔍" },
  { label: "History", path: "/dashboard/history", icon: "📁" },
  { label: "API Keys", path: "/dashboard/api-keys", icon: "🔑" },
  { label: "Reports", path: "/dashboard/reports", icon: "📄" },
  { label: "Settings", path: "/dashboard/settings", icon: "⚙️", bottom: true },
];

export default function Dashboard() {
  const mainItems = NAV_ITEMS.filter((i) => !i.bottom);
  const bottomItems = NAV_ITEMS.filter((i) => i.bottom);

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="px-6 py-6 border-b border-zinc-800">
          <span className="text-2xl font-semibold tracking-tight text-zinc-100">
            Clarif<span className="text-blue-400">AI</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex flex-col flex-1 px-3 py-4 gap-1">
          {mainItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.path}
              end
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left w-full ${isActive
                  ? "bg-zinc-800 text-blue-400 border-l-2 border-blue-400 pl-[10px]"
                  : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                }`
              }
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}

          <div className="mt-auto">
            {bottomItems.map((item) => (
              <NavLink
                key={item.label}
                to={item.path}
                end
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left w-full ${isActive
                    ? "bg-zinc-800 text-blue-400 border-l-2 border-blue-400 pl-[10px]"
                    : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                  }`
                }
              >
                <span className="text-base leading-none">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </aside>

      {/* Main content - Renders child routes */}
      <Outlet />
    </div>
  );
}
