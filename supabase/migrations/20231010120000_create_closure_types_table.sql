create policy "Permitir leitura para membros da organização" 
on public.closure_types 
for select using (
  organization_id = current_setting('app.current_organization_id')::uuid
);

create policy "Permitir escrita para administradores da organização"
on public.closure_types
for all using (
  exists (
    select 1 from organization_members
    where organization_members.organization_id = closure_types.organization_id
    and organization_members.user_id = auth.uid()
    and organization_members.role in ('owner', 'admin')
  )
); 