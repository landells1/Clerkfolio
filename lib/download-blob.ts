// Save a Blob as a file download. WebKit (iOS Safari) needs the anchor to be in
// the DOM and the object URL to stay alive until the download has started -
// revoking synchronously after click() aborts it there.
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}
