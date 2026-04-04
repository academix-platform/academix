import * as Icons from "lucide-react";
import { LucideIcon } from "lucide-react";

type IconName = keyof typeof Icons;

type Props = {
  name: IconName;
  className?: string;
  size?: number;
};

export default function Icon({ name, className, size = 20 }: Props) {
  const LucideIconComponent = Icons[name] as LucideIcon;

  if (!LucideIconComponent) return null;

  return <LucideIconComponent size={size} className={className} />;
}
