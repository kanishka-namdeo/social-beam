import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Ghost, ArrowLeft, House } from "@phosphor-icons/react/ssr";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Ghost className="mx-auto size-16 text-muted-foreground" weight="thin" />
          <CardTitle className="mt-4 text-6xl font-bold text-brand">404</CardTitle>
          <CardDescription className="mt-2 text-base">
            This page has drifted into the void. The link may be broken, or the page was moved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-center text-sm text-muted-foreground">
            Head back to where you were, or start fresh from the homepage.
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" asChild>
              <a href="javascript:history.back()">
                <ArrowLeft className="mr-2 size-4" />
                Go Back
              </a>
            </Button>
            <Button variant="default" asChild>
              <a href="/">
                <House className="mr-2 size-4" />
                Homepage
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
