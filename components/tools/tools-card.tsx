import Link from 'next/link';
import { ArrowRight } from '@phosphor-icons/react/ssr';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Icon } from '@phosphor-icons/react';

interface ToolsCardProps {
  icon: Icon;
  title: string;
  description: string;
  href: string;
}

export function ToolsCard({ icon: Icon, title, description, href }: ToolsCardProps) {
  return (
    <Link href={href} className="block">
      <Card className="border-border rounded-sm hover-lift transition-shadow h-full">
        <CardHeader className="pb-3">
          <div className="p-3 bg-brand/10 text-brand w-fit mb-3 rounded-sm" aria-hidden="true">
            <Icon className="w-6 h-6" />
          </div>
          <CardTitle className="text-xl text-foreground tracking-tight">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-muted-foreground text-base leading-relaxed">
            {description}
          </CardDescription>
          <div className="mt-4 flex items-center gap-2 text-sm text-brand font-medium">
            Try it free
            <ArrowRight weight="bold" className="w-4 h-4" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
