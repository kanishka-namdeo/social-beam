export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      {/* Multi-layer gradient background with subtle animation */}
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(135deg,var(--background)_0%,oklch(from_var(--muted)_l_c_h_/_0.4)_30%,oklch(from_var(--brand)_l_c_h_/_0.05)_60%,var(--background)_100%)]" />
      {/* Grid pattern overlay for tech feel */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />
      {/* Top accent line with brand glow */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/60 to-transparent" />
      {/* Subtle center glow */}
      <div className="pointer-events-none fixed left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-sm bg-brand/5 blur-3xl" />
      <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-16 sm:px-6">
        {children}
      </div>
    </div>
  );
}
