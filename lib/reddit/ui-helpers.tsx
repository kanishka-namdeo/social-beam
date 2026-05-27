import {
  ChatText,
  Pen,
  Eye,
  BellSimple,
} from "@phosphor-icons/react/ssr";

export function getActionIcon(action: string): React.ReactNode {
  const normalized = action.toLowerCase();
  const iconClass = "size-3.5";

  if (normalized.includes("comment") || normalized.includes("reply")) {
    return (
      <span className="inline-flex items-center gap-1" title="Comment">
        <ChatText className={iconClass} weight="bold" aria-hidden="true" />
        <span className="sr-only">Comment</span>
      </span>
    );
  }
  if (normalized.includes("create") || normalized.includes("write") || normalized.includes("draft")) {
    return (
      <span className="inline-flex items-center gap-1" title="Create content">
        <Pen className={iconClass} weight="bold" aria-hidden="true" />
        <span className="sr-only">Create content</span>
      </span>
    );
  }
  if (normalized.includes("monitor") || normalized.includes("watch") || normalized.includes("track")) {
    return (
      <span className="inline-flex items-center gap-1" title="Monitor">
        <Eye className={iconClass} weight="bold" aria-hidden="true" />
        <span className="sr-only">Monitor</span>
      </span>
    );
  }
  if (normalized.includes("alert") || normalized.includes("notify")) {
    return (
      <span className="inline-flex items-center gap-1" title="Alert">
        <BellSimple className={iconClass} weight="bold" aria-hidden="true" />
        <span className="sr-only">Alert</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1" title={action}>
      <ChatText className={iconClass} weight="bold" aria-hidden="true" />
      <span className="sr-only">{action}</span>
    </span>
  );
}
