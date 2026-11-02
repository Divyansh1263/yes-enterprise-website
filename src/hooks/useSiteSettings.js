/**
 * Site settings hook — will be implemented at Milestone C.
 * Will load editable business details from Supabase site_settings table.
 */
export function useSiteSettings() {
  return {
    settings: {},
    loading: false,
    error: null,
  }
}
