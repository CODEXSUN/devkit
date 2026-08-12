"use client";

import { useEffect, useState } from "react";

const VISIBILITY_KEY = "devkit.screen-companion.visible";

export function useMascotVisibility(enabled: boolean) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const storedValue = window.localStorage.getItem(VISIBILITY_KEY);
    setVisible(storedValue === null ? true : storedValue === "true");
  }, [enabled]);

  const updateVisible = (nextVisible: boolean) => {
    setVisible(nextVisible);
    window.localStorage.setItem(VISIBILITY_KEY, String(nextVisible));
  };

  return [visible, updateVisible] as const;
}
