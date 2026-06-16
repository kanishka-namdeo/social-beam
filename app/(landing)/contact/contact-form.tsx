"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowRight, CheckCircle, WarningCircle } from "@phosphor-icons/react/ssr";

type FormStatus = "idle" | "loading" | "success" | "error";

export function ContactForm() {
  const [status, setStatus] = useState<FormStatus>("idle");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      setStatus("success");
      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (error) {
      setStatus("error");
      console.error("Contact form error:", error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const isLoading = status === "loading";

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          placeholder="Your full name"
          className="rounded-sm"
          value={formData.name}
          onChange={handleChange}
          disabled={isLoading}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          className="rounded-sm"
          value={formData.email}
          onChange={handleChange}
          disabled={isLoading}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="subject">Subject</Label>
        <Input
          id="subject"
          placeholder="What is this about?"
          className="rounded-sm"
          value={formData.subject}
          onChange={handleChange}
          disabled={isLoading}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          placeholder="Tell us more..."
          rows={5}
          className="rounded-sm"
          value={formData.message}
          onChange={handleChange}
          disabled={isLoading}
          required
        />
      </div>

      {status === "success" && (
        <div className="flex items-center gap-2 p-3 rounded-sm bg-green-50 text-green-800 text-sm">
          <CheckCircle className="w-4 h-4" />
          <span>Message sent successfully! We'll get back to you soon.</span>
        </div>
      )}

      {status === "error" && (
        <div className="flex items-center gap-2 p-3 rounded-sm bg-red-50 text-red-800 text-sm">
          <WarningCircle className="w-4 h-4" />
          <span>Failed to send message. Please try again or email us directly.</span>
        </div>
      )}

      <Button type="submit" className="w-full gap-2 rounded-sm" disabled={isLoading}>
        {isLoading ? (
          <>
            <span>Sending...</span>
          </>
        ) : (
          <>
            <span>Send message</span>
            <ArrowRight weight="bold" className="w-4 h-4" />
          </>
        )}
      </Button>
    </form>
  );
}
