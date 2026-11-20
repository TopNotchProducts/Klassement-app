-- ============================================================================
-- Fase 2 — Storage-bucket voor organisatielogo's.
--
-- Publiek leesbaar (het logo staat op de publieke pagina's). Er komen GEEN
-- policies op storage.objects: uploaden gebeurt alleen server-side met de
-- service role, nadat de server action heeft gecontroleerd dat de gebruiker
-- beheerder is. Pad: <organisatie_id>/logo-<tijd>.<ext>. Geen SVG (kan scripts bevatten).
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logo', 'logo', true, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;
