"use client";

import Link, { LinkProps } from "next/link";
import { useRouter } from "next/navigation";
import { ReactNode } from "react";
import { useLoading } from "./LoadingProvider";

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
  const router = useRouter();
  const { startTransition } = useLoading();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    startTransition(() => {
      router.push(String(href));
    });
  };

  return (
    <Link
      href={href}
      className={className}
      onClick={handleClick}
      prefetch={prefetch}
      {...props}
    >
      {children}
    </Link>
  );
}
