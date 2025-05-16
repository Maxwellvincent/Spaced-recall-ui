import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbProps extends React.ComponentPropsWithoutRef<"nav"> {
  separator?: React.ReactNode;
  children: React.ReactNode;
}

export interface BreadcrumbItemProps extends React.ComponentPropsWithoutRef<"li"> {
  children: React.ReactNode;
}

export interface BreadcrumbLinkProps extends React.ComponentPropsWithoutRef<typeof Link> {
  children: React.ReactNode;
  asChild?: boolean;
}

export function Breadcrumb({
  separator = <ChevronRight className="h-4 w-4" />,
  children,
  className,
  ...props
}: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex flex-wrap items-center text-sm text-slate-400", className)}
      {...props}
    >
      <ol className="flex items-center space-x-2">
        {children}
      </ol>
    </nav>
  );
}

export function BreadcrumbItem({
  children,
  className,
  ...props
}: BreadcrumbItemProps) {
  return (
    <li
      className={cn("inline-flex items-center gap-1", className)}
      {...props}
    >
      {children}
    </li>
  );
}

export function BreadcrumbLink({
  children,
  className,
  asChild = false,
  ...props
}: BreadcrumbLinkProps) {
  if (asChild) {
    return (
      <span className={cn("hover:text-slate-200 transition-colors", className)}>
        {children}
      </span>
    );
  }

  return (
    <Link
      className={cn("hover:text-slate-200 transition-colors", className)}
      {...props}
    >
      {children}
    </Link>
  );
}

export function BreadcrumbSeparator({
  children,
  className,
  ...props
}: React.ComponentPropsWithoutRef<"li">) {
  return (
    <li
      className={cn("text-slate-500", className)}
      {...props}
    >
      {children || <ChevronRight className="h-4 w-4" />}
    </li>
  );
}

export function BreadcrumbEllipsis({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"span">) {
  return (
    <span
      className={cn("flex h-4 w-4 items-center justify-center", className)}
      {...props}
    >
      <span className="text-slate-400">...</span>
    </span>
  );
} 