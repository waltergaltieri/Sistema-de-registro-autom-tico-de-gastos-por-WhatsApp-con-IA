-- ==========================================
-- Seed Data — Demo Organization + Categories
-- Replace UUIDs and data as needed
-- ==========================================

-- Create demo organization
insert into organizations (id, name, whatsapp_group_id)
values (
  'a0000000-0000-0000-0000-000000000001',
  'Mi Negocio',
  null -- Set your WhatsApp group ID here
) on conflict do nothing;

-- Create initial categories
insert into expense_categories (organization_id, name, description) values
  ('a0000000-0000-0000-0000-000000000001', 'Alquiler / seña', 'Pagos de alquiler, señas, depósitos'),
  ('a0000000-0000-0000-0000-000000000001', 'Obra / remodelación', 'Trabajos de construcción y remodelación'),
  ('a0000000-0000-0000-0000-000000000001', 'Materiales', 'Materiales de construcción y obra'),
  ('a0000000-0000-0000-0000-000000000001', 'Mobiliario', 'Muebles y equipamiento del local'),
  ('a0000000-0000-0000-0000-000000000001', 'Equipamiento', 'Equipos, herramientas, maquinaria'),
  ('a0000000-0000-0000-0000-000000000001', 'Mercadería inicial', 'Stock inicial para el negocio'),
  ('a0000000-0000-0000-0000-000000000001', 'Marketing', 'Publicidad, redes sociales, campañas'),
  ('a0000000-0000-0000-0000-000000000001', 'Diseño / branding', 'Logo, diseño gráfico, cartelería'),
  ('a0000000-0000-0000-0000-000000000001', 'Trámites / legales', 'Habilitaciones, permisos, honorarios legales'),
  ('a0000000-0000-0000-0000-000000000001', 'Servicios', 'Luz, gas, agua, internet, hosting'),
  ('a0000000-0000-0000-0000-000000000001', 'Limpieza', 'Productos y servicios de limpieza'),
  ('a0000000-0000-0000-0000-000000000001', 'Tecnología', 'Software, hardware, suscripciones tech'),
  ('a0000000-0000-0000-0000-000000000001', 'Transporte / envíos', 'Fletes, envíos, combustible'),
  ('a0000000-0000-0000-0000-000000000001', 'Comida / reuniones', 'Café, almuerzos de trabajo, catering'),
  ('a0000000-0000-0000-0000-000000000001', 'Otros', 'Gastos que no entran en otra categoría')
on conflict do nothing;

-- Note: User profiles should be created after
-- auth users are set up in Supabase Auth.
-- Example:
--
-- insert into users_profile (organization_id, auth_user_id, full_name, whatsapp_phone, role)
-- values (
--   'a0000000-0000-0000-0000-000000000001',
--   '<auth-user-uuid>',
--   'Walter',
--   '+5491112345678',
--   'admin'
-- );
