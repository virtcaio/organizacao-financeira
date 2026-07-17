CREATE INDEX "budget_user_month_idx" ON "budget" USING btree ("user_id","month");--> statement-breakpoint
CREATE INDEX "transaction_tag_tag_idx" ON "transaction_tag" USING btree ("tag_id");