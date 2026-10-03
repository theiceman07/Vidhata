"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sendContactMessage } from "@/lib/api/contact";

type SendState = "idle" | "sending" | "sent" | "error";

/**
 * A mocked contact form. It never sends anything, and says so, so nobody
 * waits on a reply that cannot come.
 */
export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<SendState>("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    try {
      await sendContactMessage({ name, email, message });
      setState("sent");
    } catch {
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <div role="status" className="rounded-card bg-parchment p-6">
        <p className="font-display text-h3 text-ink">Thanks, {name}.</p>
        <p className="mt-2 text-body text-muted-fg">
          This is a preview, so your message was not sent and nothing was
          saved.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-card bg-parchment p-6">
      <div>
        <Label htmlFor="contact-name">Your name</Label>
        <Input
          id="contact-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          required
        />
      </div>
      <div>
        <Label htmlFor="contact-email">Email</Label>
        <Input
          id="contact-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
      </div>
      <div>
        <Label htmlFor="contact-message">Message</Label>
        <Textarea
          id="contact-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          required
        />
      </div>

      {state === "error" && (
        <p role="alert" className="text-small text-flagged">
          Could not send your message. Try again.
        </p>
      )}

      <div className="flex items-center justify-between gap-4">
        <p className="text-label text-muted-fg">
          Preview. Messages are not sent and nothing is saved.
        </p>
        <Button type="submit" disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : "Send message"}
        </Button>
      </div>
    </form>
  );
}
