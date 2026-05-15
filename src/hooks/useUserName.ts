import { useState } from 'react'

const KEY = 'ht_user_name'

export function useUserName() {
  const [userName, setUserNameState] = useState<string | null>(
    () => localStorage.getItem(KEY)
  )

  function setUserName(name: string) {
    localStorage.setItem(KEY, name)
    setUserNameState(name)
  }

  function clearUserName() {
    localStorage.removeItem(KEY)
    setUserNameState(null)
  }

  return { userName, setUserName, clearUserName }
}
