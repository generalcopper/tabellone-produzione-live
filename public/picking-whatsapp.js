// Compatibility for cached shells. Notifications now share one list and editor.
export function createPickingWhatsApp() {
  return { setUsers() {}, refresh() {}, reset() {} };
}
