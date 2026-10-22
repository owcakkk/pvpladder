import type { Kit } from "@/lib/kits";

export function KitIcon({ kit, className }: { kit: Kit; className?: string }) {
  if (kit.image) return <img src={kit.image} alt="" draggable={false} className={`object-contain ${className ?? ""}`} />;
  const Icon = kit.icon;
  if (!Icon) return null;
  return <Icon className={className} />;
}
