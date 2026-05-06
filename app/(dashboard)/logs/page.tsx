import LogsKindPage from './[kind]/page'

export default function LogsPage() {
  return <LogsKindPage params={Promise.resolve({ kind: 'training' })} />
}
