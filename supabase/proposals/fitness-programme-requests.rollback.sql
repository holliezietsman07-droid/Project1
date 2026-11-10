-- Review proposal. Freeze request actions while retaining sent requests and replies.
begin;
update hka_fitness.settings set requests_enabled=false where id;
commit;
