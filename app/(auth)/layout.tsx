export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0B0B0C] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-10 justify-center">
          <div className="w-8 h-8 rounded-lg bg-[#1D9E75] flex items-center justify-center text-[#0B0B0C] font-bold text-base font-mono">
            C
          </div>
          <span className="text-[#F5F5F2] font-semibold text-lg tracking-tight">Clinidex</span>
        </div>
        {children}
      </div>
    </div>
  )
}
