"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * The two ways in to a document.
 *
 * Describing a deal is the one that works. Bringing an existing contract for
 * review is not built, so it is shown, disabled and marked "Coming soon", the
 * way the contract picker shows a type that cannot be drafted yet: a visitor
 * can see it is planned, and nothing pretends it is there. It takes no
 * upload, and no one is asked for a file.
 */
export function DraftPaths({ children }: { children: React.ReactNode }) {
  return (
    <Tabs defaultValue="describe">
      <TabsList
        aria-label="How to start"
        className="h-auto flex-wrap justify-start gap-1 rounded-full bg-parchment p-1"
      >
        <TabsTrigger
          value="describe"
          className="rounded-full px-5 py-2.5 text-body data-[state=active]:bg-ink data-[state=active]:text-paper data-[state=active]:shadow-none"
        >
          Describe a deal
        </TabsTrigger>
        <TabsTrigger
          value="upload"
          disabled
          className="gap-2 rounded-full px-5 py-2.5 text-body text-muted-fg disabled:opacity-100"
        >
          Upload an existing contract
          <span className="rounded-full bg-paper px-2.5 py-0.5 text-label text-muted-fg">
            Coming soon
          </span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="describe" className="mt-decision">
        {children}
      </TabsContent>
    </Tabs>
  );
}
