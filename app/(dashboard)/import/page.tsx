import ImportForm from '@/components/import/import-form'

export default function ImportPage() {
  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#F5F5F2] tracking-tight">Import</h1>
        <p className="text-sm text-[rgba(245,245,242,0.45)] mt-1">Import portfolio entries from a CSV file.</p>
      </div>
      <ImportForm />
    </div>
  )
}
