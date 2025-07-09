import { cn } from "@/lib/utils";
import {
  IconActivity,
  IconBell,
  IconChartLine,
  IconClock,
  IconGlobe,
  IconShield,
  IconSettings,
  IconBolt,
} from "@tabler/icons-react";

export function FeaturesSectionWithHoverEffects() {
  const features = [
    {
      title: "Real-time Monitoring",
      description:
        "Monitor your APIs 24/7 with instant status updates and comprehensive health checks.",
      icon: <IconActivity />,
    },
    {
      title: "Instant Alerts",
      description:
        "Get notified immediately when issues occur via email, SMS, Slack, and more.",
      icon: <IconBell />,
    },
    {
      title: "Performance Analytics",
      description:
        "Deep insights into response times, uptime metrics, and performance trends.",
      icon: <IconChartLine />,
    },
    {
      title: "Global Monitoring",
      description: "Monitor from multiple locations worldwide for comprehensive coverage.",
      icon: <IconGlobe />,
    },
    {
      title: "Quick Setup",
      description: "Get your monitoring up and running in under 60 seconds.",
      icon: <IconBolt />,
    },
    {
      title: "Advanced Configuration",
      description:
        "Customize monitoring intervals, timeout settings, and alert thresholds.",
      icon: <IconSettings />,
    },
    {
      title: "99.9% Uptime SLA",
      description:
        "Reliable monitoring infrastructure with industry-leading uptime guarantees.",
      icon: <IconShield />,
    },
    {
      title: "Historical Data",
      description: "Access detailed historical data and trends for long-term analysis.",
      icon: <IconClock />,
    },
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4  relative z-10 py-10 max-w-7xl mx-auto">
      {features.map((feature, index) => (
        <Feature key={feature.title} {...feature} index={index} />
      ))}
    </div>
  );
}

const Feature = ({
  title,
  description,
  icon,
  index,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  index: number;
}) => {
  return (
    <div
      className={cn(
        "flex flex-col lg:border-r py-10 relative group/feature border-border hover:border-primary/30 transition-colors duration-300",
        (index === 0 || index === 4) && "lg:border-l border-border hover:border-primary/30",
        index < 4 && "lg:border-b border-border hover:border-primary/30"
      )}
    >
      {index < 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-300 absolute inset-0 h-full w-full bg-gradient-to-t from-primary/5 to-transparent pointer-events-none" />
      )}
      {index >= 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-300 absolute inset-0 h-full w-full bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
      )}
      <div className="mb-4 relative z-10 px-10 text-muted-foreground group-hover/feature:text-primary transition-colors duration-300">
        {icon}
      </div>
      <div className="text-lg font-bold mb-2 relative z-10 px-10">
        <div className="absolute left-0 inset-y-0 h-6 group-hover/feature:h-8 w-1 rounded-tr-full rounded-br-full bg-muted group-hover/feature:bg-gradient-to-b group-hover/feature:from-primary group-hover/feature:to-primary/80 transition-all duration-300 origin-center group-hover/feature:shadow-lg group-hover/feature:shadow-primary/25" />
        <span className="group-hover/feature:translate-x-2 transition duration-300 inline-block text-foreground group-hover/feature:text-primary">
          {title}
        </span>
      </div>
      <p className="text-sm text-muted-foreground max-w-xs relative z-10 px-10 group-hover/feature:text-foreground transition-colors duration-300">
        {description}
      </p>
    </div>
  );
};
