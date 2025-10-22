type Tab = "my-assessment" | "shared-with-me" | "my-feedback";

interface TabNavigationProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  sharedWithMeCount?: number;
  myFeedbackCount?: number;
}

export default function TabNavigation({
  activeTab,
  onTabChange,
  sharedWithMeCount = 0,
  myFeedbackCount = 0,
}: TabNavigationProps) {
  const tabs = [
    { id: "my-assessment" as Tab, label: "My Assessment" },
    {
      id: "shared-with-me" as Tab,
      label: "Shared With Me",
      count: sharedWithMeCount,
    },
    {
      id: "my-feedback" as Tab,
      label: "My Feedback",
      count: myFeedbackCount,
    },
  ];

  return (
    <div className="border-b border-[#00A8E1]/30 bg-[#003B5C]">
      <div className="max-w-4xl mx-auto px-4">
        <nav className="flex gap-1" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  px-4 py-3 text-sm font-medium transition-all uppercase tracking-wide
                  ${
                    isActive
                      ? "text-white border-b-2 border-[#00A8E1] bg-[#00A8E1]/10"
                      : "text-white/70 hover:text-white hover:bg-white/5"
                  }
                `}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${
                      isActive
                        ? "bg-[#00A8E1] text-white"
                        : "bg-white/20 text-white/80"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
