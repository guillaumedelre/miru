import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import AddMediaDialog from '@/components/AddMediaDialog'

export default function Import() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const q = params.get('q') ?? ''
  const [open, setOpen] = useState(true)

  function handleClose() {
    setOpen(false)
    navigate('/library')
  }

  return (
    <>
      <div className="min-h-screen flex items-center justify-center">
        <div className="texture" aria-hidden />
        <p className="text-muted-foreground text-sm">Importation en cours...</p>
      </div>
      <AddMediaDialog open={open} onClose={handleClose} initialQuery={q} />
    </>
  )
}
