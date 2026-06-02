"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PLATFORM_DIMENSIONS } from "@/lib/media/constants";

interface PlatformDimensionHintsProps {
  connectedPlatforms?: string[];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

export function PlatformDimensionHints({ connectedPlatforms = [] }: PlatformDimensionHintsProps) {
  return (
    <Accordion type="single" collapsible className="w-full">
      {Object.entries(PLATFORM_DIMENSIONS).map(([key, platform]) => {
        const isConnected = connectedPlatforms.includes(key);

        return (
          <AccordionItem key={key} value={key}>
            <AccordionTrigger className="text-sm">
              <span className="flex items-center gap-2">
                {platform.displayName}
                {isConnected && (
                  <Badge variant="secondary" className="text-[10px] normal-case rounded-sm">
                    Connected
                  </Badge>
                )}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Size Type</TableHead>
                    <TableHead className="text-xs">Dimensions</TableHead>
                    <TableHead className="text-xs">Aspect Ratio</TableHead>
                    <TableHead className="text-xs">Max Size</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(platform.sizes).map(([sizeKey, spec]) => (
                    <TableRow key={sizeKey}>
                      <TableCell className="text-xs font-medium">{spec.label}</TableCell>
                      <TableCell className="text-xs font-mono">
                        {spec.width} × {spec.height}
                      </TableCell>
                      <TableCell className="text-xs">{spec.aspectRatio}</TableCell>
                      <TableCell className="text-xs">{formatFileSize(spec.maxFileSize)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
