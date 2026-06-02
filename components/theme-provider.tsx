"use client";

import * as React from "react";
import { ThemeProvider as WrkszThemeProvider } from "@wrksz/themes/next";

function ThemeProvider({ children, ...props }: React.ComponentProps<typeof WrkszThemeProvider>) {
  return <WrkszThemeProvider {...props}>{children}</WrkszThemeProvider>;
}

export { ThemeProvider };
