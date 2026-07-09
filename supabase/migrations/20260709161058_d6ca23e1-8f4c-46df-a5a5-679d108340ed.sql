REVOKE EXECUTE ON FUNCTION public.invite_admin_by_email(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.list_admin_invites() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.revoke_admin_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invite_admin_by_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_admin_invites() TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_admin_invite(text) TO authenticated;