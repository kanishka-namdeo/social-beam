"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { X } from "@phosphor-icons/react";

type CookiePreferences = {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
};

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    analytics: true,
    marketing: false,
  });

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const acceptAll = () => {
    const allAccepted = { essential: true, analytics: true, marketing: true };
    localStorage.setItem("cookie-consent", JSON.stringify(allAccepted));
    setIsVisible(false);
    window.dispatchEvent(new CustomEvent("cookie-consent-updated", { detail: allAccepted }));
  };

  const rejectNonEssential = () => {
    const essentialOnly = { essential: true, analytics: false, marketing: false };
    localStorage.setItem("cookie-consent", JSON.stringify(essentialOnly));
    setIsVisible(false);
    window.dispatchEvent(new CustomEvent("cookie-consent-updated", { detail: essentialOnly }));
  };

  const savePreferences = () => {
    localStorage.setItem("cookie-consent", JSON.stringify(preferences));
    setIsVisible(false);
    window.dispatchEvent(new CustomEvent("cookie-consent-updated", { detail: preferences }));
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:bottom-4 md:max-w-md z-50 animate-in slide-in-from-bottom-4">
      <Card className="shadow-2xl border-border">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">Cookie Preferences</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsVisible(false)}
              className="h-6 w-6"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showCustomize ? (
            <>
              <p className="text-sm text-muted-foreground">
                We use cookies to enhance your browsing experience, serve personalized ads or content, and analyze our
                traffic. By clicking "Accept All", you consent to our use of cookies.
              </p>
              <p className="text-xs text-muted-foreground">
                Read our{" "}
                <a href="/cookie-policy" className="text-brand hover:underline">
                  Cookie Policy
                </a>{" "}
                and{" "}
                <a href="/privacy" className="text-brand hover:underline">
                  Privacy Policy
                </a>{" "}
                to learn more.
              </p>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="essential">Essential Cookies</Label>
                  <p className="text-xs text-muted-foreground">Required for the website to function</p>
                </div>
                <Switch id="essential" checked={preferences.essential} disabled />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="analytics">Analytics Cookies</Label>
                  <p className="text-xs text-muted-foreground">Help us understand how you use our site</p>
                </div>
                <Switch
                  id="analytics"
                  checked={preferences.analytics}
                  onCheckedChange={(checked) => setPreferences({ ...preferences, analytics: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="marketing">Marketing Cookies</Label>
                  <p className="text-xs text-muted-foreground">Used to deliver personalized ads</p>
                </div>
                <Switch
                  id="marketing"
                  checked={preferences.marketing}
                  onCheckedChange={(checked) => setPreferences({ ...preferences, marketing: checked })}
                />
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex gap-2">
          {!showCustomize ? (
            <>
              <Button variant="outline" onClick={rejectNonEssential} className="flex-1">
                Reject All
              </Button>
              <Button onClick={acceptAll} className="flex-1">
                Accept All
              </Button>
              <Button variant="ghost" onClick={() => setShowCustomize(true)} className="w-full">
                Customize
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setShowCustomize(false)} className="flex-1">
                Back
              </Button>
              <Button onClick={savePreferences} className="flex-1">
                Save Preferences
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
