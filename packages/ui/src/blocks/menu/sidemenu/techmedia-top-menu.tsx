"use client";

import { BellIcon, CheckIcon, GripIcon, HomeIcon, SearchIcon, XIcon } from "lucide-react";
import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "../../../components/avatar";
import { Button } from "../../../components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from "../../../components/dropdown-menu";
import { Input } from "../../../components/input";
import { Separator } from "../../../components/separator";
import { SidebarTrigger } from "../../../components/sidebar";
import { DesignThemeMenu, type TopMenuWorkspaceItem } from "./top-menu";
import type { TopUserMenuUser } from "./top-user-menu";
import { TechmediaUserMenu } from "./techmedia-user-menu";

type TechmediaTopMenuProps = {
  homeHref?: string;
  logoutHref?: string;
  onLogout?: () => void | Promise<void>;
  pageTitle?: string;
  profileHref?: string;
  searchPlaceholder?: string;
  showHomeAction?: boolean;
  showPageTitle?: boolean;
  showThemeAction?: boolean;
  user: TopUserMenuUser;
  workspaceItems: TopMenuWorkspaceItem[];
};

export function TechmediaTopMenu({
  homeHref = "/workspace",
  logoutHref = "/login",
  onLogout,
  pageTitle = "Workspace",
  profileHref,
  searchPlaceholder = "Search CodeLogicX",
  showHomeAction = true,
  showPageTitle = true,
  showThemeAction = true,
  user,
  workspaceItems
}: TechmediaTopMenuProps) {
  const [search, setSearch] = useState("");
  const activeWorkspace = workspaceItems.find((item) => item.active) ?? workspaceItems[0];
  const ActiveWorkspaceIcon = activeWorkspace?.icon;

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full shrink-0 items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90">
      <div className="flex h-full shrink-0 items-center">
        <div className="flex h-full w-16 items-center justify-center border-r bg-background">
          <SidebarTrigger className="size-9 rounded-full border-0 bg-transparent shadow-none" />
        </div>
        <div className="flex min-w-0 items-center gap-3 px-4 text-sm">
          <div className="flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 font-medium">
            {ActiveWorkspaceIcon ? (
              <ActiveWorkspaceIcon className="size-4 shrink-0 text-muted-foreground" />
            ) : null}
            <span className="truncate">{activeWorkspace?.title ?? "Workspace"}</span>
          </div>
          {showPageTitle ? (
            <>
              <Separator className="hidden h-4 sm:block" orientation="vertical" />
              <span className="hidden truncate font-medium sm:inline">{pageTitle}</span>
            </>
          ) : null}
        </div>
      </div>
      <div className="mx-3 flex min-w-24 max-w-3xl flex-1 items-center sm:mx-6">
        <div className="relative w-full">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Global search"
            className="h-10 rounded-full border-transparent bg-muted/80 pl-11 pr-4 shadow-none focus-visible:border-primary/30 focus-visible:bg-background"
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            type="search"
            value={search}
          />
        </div>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1 px-3">
        <NotificationMenu user={user} workspaceTitle={activeWorkspace?.title ?? "workspace"} />
        {showHomeAction ? (
          <Button asChild className="hidden h-8 px-3 sm:inline-flex" size="sm" variant="outline">
            <a href={homeHref}>
              <HomeIcon />
              Home
            </a>
          </Button>
        ) : null}
        <div className="ml-2 flex items-center gap-3">
          <AppLauncher items={workspaceItems} user={user} />
          <TechmediaUserMenu
            logoutHref={logoutHref}
            {...(onLogout ? { onLogout } : {})}
            {...(profileHref ? { profileHref } : {})}
            user={user}
          />
          {showThemeAction ? <DesignThemeMenu rounded /> : null}
        </div>
      </div>
    </header>
  );
}

function NotificationMenu({
  user,
  workspaceTitle
}: {
  user: TopUserMenuUser;
  workspaceTitle: string;
}) {
  const [showWelcome, setShowWelcome] = useState(true);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={showWelcome ? "Notifications, 1 unread" : "Notifications"}
          className="relative size-9 rounded-full"
          size="icon"
          variant="ghost"
        >
          <BellIcon />
          {showWelcome ? (
            <span className="absolute right-1.5 top-1.5 size-2.5 rounded-full border-2 border-background bg-destructive" />
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 rounded-2xl p-2 shadow-xl" sideOffset={10}>
        <DropdownMenuLabel className="px-3 py-2 text-sm font-semibold">
          Notifications
        </DropdownMenuLabel>
        {showWelcome ? (
          <div className="relative rounded-xl border bg-background px-3 py-3 pr-10 shadow-sm">
            <p className="text-sm font-semibold">Welcome to {workspaceTitle}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Hi {user.name}, your developer workspace is ready.
            </p>
            <Button
              aria-label="Dismiss welcome notification"
              className="absolute right-2 top-2 size-7 rounded-full"
              onClick={() => setShowWelcome(false)}
              size="icon"
              variant="ghost"
            >
              <XIcon className="size-4" />
            </Button>
          </div>
        ) : (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            No new notifications.
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AppLauncher({ items, user }: { items: TopMenuWorkspaceItem[]; user: TopUserMenuUser }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Apps"
          className="size-9 rounded-full p-0 ring-2 ring-border ring-offset-1"
          size="icon"
          variant="ghost"
        >
          <GripIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[22rem] rounded-[1.75rem] p-3 shadow-2xl"
        sideOffset={10}
      >
        <DropdownMenuLabel className="px-3 py-2 text-sm font-medium">Apps</DropdownMenuLabel>
        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-background p-2 shadow-sm">
          {items.map((item) => (
            <DropdownMenuItem
              asChild={Boolean(item.url && !item.onSelect)}
              className="relative flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl p-2 text-center"
              key={item.title}
              {...(item.onSelect
                ? {
                    onSelect: (event) => {
                      event.preventDefault();
                      item.onSelect?.();
                    }
                  }
                : {})}
            >
              {item.url && !item.onSelect ? (
                <a href={item.url} title={item.description}>
                  <AppLauncherTile item={item} user={user} />
                </a>
              ) : (
                <button title={item.description} type="button">
                  <AppLauncherTile item={item} user={user} />
                </button>
              )}
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AppLauncherTile({ item, user }: { item: TopMenuWorkspaceItem; user: TopUserMenuUser }) {
  return (
    <>
      <div
        className={`relative flex size-11 items-center justify-center rounded-xl border bg-background shadow-sm ${item.active ? "border-primary/40 bg-primary/10 text-primary ring-2 ring-primary/10" : ""}`}
      >
        {item.avatar ? (
          <Avatar className="size-9">
            {user.avatarSrc ? <AvatarImage alt={user.name} src={user.avatarSrc} /> : null}
            <AvatarFallback className="bg-muted text-xs font-semibold">
              {user.fallback}
            </AvatarFallback>
          </Avatar>
        ) : (
          <item.icon className="size-5" />
        )}
        {item.active ? (
          <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <CheckIcon className="size-2.5" />
          </span>
        ) : null}
      </div>
      <span className="w-full truncate text-xs font-medium">{item.title}</span>
    </>
  );
}
