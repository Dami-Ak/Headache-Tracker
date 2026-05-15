import { useState } from 'react'

const KEY = 'medication'

export function useMedication() {
  const [medication, setMedicationState] = useState<string | null>(
    () => localStorage.getItem(KEY)
  )

  function setMedication(name: string) {
    localStorage.setItem(KEY, name)
    setMedicationState(name)
  }

  function clearMedication() {
    localStorage.removeItem(KEY)
    setMedicationState(null)
  }

  return { medication, setMedication, clearMedication }
}
