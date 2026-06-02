"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowRight } from "@phosphor-icons/react/ssr";

export function ContactForm() {
  return (
    <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" placeholder="Your full name" className="rounded-sm" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="you@example.com" className="rounded-sm" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="subject">Subject</Label>
        <Input id="subject" placeholder="What is this about?" className="rounded-sm" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          placeholder="Tell us more..."
          rows={5}
          className="rounded-sm"
        />
      </div>
      <Button type="submit" className="w-full gap-2 rounded-sm">
        Send message
        <ArrowRight weight="bold" className="w-4 h-4" />
      </Button>
    </form>
  );
}
