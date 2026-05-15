const KEY = 'ht_user_name'

export function getUserId(): string {
  const name = localStorage.getItem(KEY)
  return name ? name.toLowerCase().trim() : ''
}
