-- Checkpoint 6B-C (DECISIONS.md #15, rule 15): programme configurations are
-- immutable versions. A change is a new programme version (new rows); UPDATE is
-- rejected. DELETE stays possible (ProgramsService.deleteProgram removes
-- inactive versions without ledger activity; the ledger FK is ON DELETE RESTRICT).
CREATE OR REPLACE FUNCTION "reject_program_configuration_update"()
	RETURNS trigger
	LANGUAGE plpgsql
	AS $$
	BEGIN
		RAISE EXCEPTION 'Programme configurations are immutable; create a new programme version';
	END;
	$$;--> statement-breakpoint
CREATE TRIGGER "program_configurations_immutable"
	BEFORE UPDATE ON "program_configurations"
	FOR EACH ROW EXECUTE FUNCTION "reject_program_configuration_update"();
