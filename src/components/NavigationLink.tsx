"use client";

import Link, { LinkProps } from "next/link";
import { ReactNode } from "react";

type NavigationLinkProps = LinkProps & {
  children: ReactNode;
  className?: string;
  prefetch?: boolean;
};

export function NavigationLink({
  href,
  children,
  className,
  prefetch = true,
  ...props
}: NavigationLinkProps) {
  return (
    <Link href={href} className={className} prefetch={prefetch} {...props}>
      {children}
    </Link>
  );
}
